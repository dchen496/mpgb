package server

import (
	"fmt"
	"github.com/dchen496/mpgb/api"
	"github.com/gorilla/websocket"
	"log"
	"math/rand"
)

type game struct {
	id       int64
	players  [2]*websocket.Conn
	romImage string

	joinCh      chan joinRequest
	updateCh    chan updateRequest
	gameStarted bool
}

type joinRequest struct {
	conn     *websocket.Conn
	token    int64
	resultCh chan error
}

type updateRequest struct {
	conn     *websocket.Conn
	tick     int64
	keysDown string
	present  bool
}

var games = map[int64]*game{}

const idMax = (1 << 53) // Javascript can safely represent integers up to 2^53 - 1

func createGame(conn *websocket.Conn, msg *api.Create, token int64) (g *game, err error) {
	for {
		id := rand.Int63n(idMax)
		_, found := games[id]
		if !found {
			g = &game{
				id:       id,
				romImage: msg.RomImage,
				joinCh:   make(chan joinRequest),
				updateCh: make(chan updateRequest),
			}
			g.players[0] = conn
			games[id] = g
			break
		}
	}

	err = writeApiMessage(conn, api.AckCreate{Id: g.id, Player: 0}, token)
	if err != nil {
		return
	}

	go g.run()
	log.Println("Created game", g.id)
	return
}

func joinGame(conn *websocket.Conn, msg *api.Join, token int64) (g *game, err error) {
	g, ok := games[msg.Id]
	if !ok {
		err = fmt.Errorf("Game %d not found.", msg.Id)
		return
	}
	req := joinRequest{
		conn:     conn,
		token:    token,
		resultCh: make(chan error),
	}

	g.joinCh <- req
	err = <-req.resultCh
	if err == nil {
		log.Println("Joined game", msg.Id)
	}
	return
}

func (g *game) run() {
	var updates [2]updateRequest
	var tick int64 = 0

	defer g.cleanup()

	// game event loop
	for {
		select {
		case join := <-g.joinCh:
			// join game
			joinErr := ""
			if g.gameStarted {
				joinErr = fmt.Sprintf("Game %d has already started, can't join.", g.id)
			} else if g.players[1] != nil {
				joinErr = fmt.Sprintf("Game %d is full, can't join.", g.id)
			}
			if joinErr != "" {
				writeApiMessage(join.conn, api.AckJoin{Error: &joinErr}, join.token)
				continue
			}

			g.players[1] = join.conn
			join.resultCh <- writeApiMessage(join.conn, api.AckJoin{
				Error:    nil,
				Player:   1,
				RomImage: &g.romImage,
			}, join.token)

			// both players joined, start
			g.gameStarted = true
			err := g.broadcastMsg(api.Start{})
			if err != nil {
				return
			}

		case update := <-g.updateCh:
			// check tick (TODO: we need to buffer updates to prevent latency from slowing things down)
			if update.tick != tick {
				continue
			}

			// update keystrokes
			sync := true
			for idx, player := range g.players {
				if player == update.conn {
					updates[idx] = update
				} else if !updates[idx].present {
					sync = false
				}
			}

			// all players have sent updates for this tick, sync them
			if sync {
				err := g.broadcastMsg(api.Sync{
					KeysDown: [2]string{updates[0].keysDown, updates[1].keysDown},
					Tick:     tick,
				})
				if err != nil {
					return
				}
				tick++
			}
		}
	}
}

func (g *game) update(conn *websocket.Conn, msg *api.Update) {
	req := updateRequest{
		conn:     conn,
		tick:     msg.Tick,
		keysDown: msg.KeysDown,
		present:  true,
	}

	g.updateCh <- req
	return
}

func (g *game) cleanup() {
	g.broadcastMsg(api.Finish{})
	delete(games, g.id)
}

func (g *game) broadcastMsg(msg interface{}) (err error) {
	for _, player := range g.players {
		var merr error
		if player != nil {
			merr = writeApiMessage(player, msg, 0)
		}
		if merr != nil {
			err = merr
		}
	}
	return
}
