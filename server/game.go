package server

import (
	"fmt"
	"github.com/dchen496/mpgb/api"
	"github.com/gorilla/websocket"
	"log"
	"math/rand"
	"sync"
	"time"
)

type game struct {
	id       int64
	players  [2]*websocket.Conn
	romImage string

	joinCh      chan joinRequest
	updateCh    chan updateRequest
	gameStarted bool

	timeout *time.Timer
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

var gamesLock = sync.Mutex{}
var games = map[int64]*game{}

const idMax = (1 << 53) // Javascript can safely represent integers up to 2^53 - 1

func createGame(conn *websocket.Conn, msg *api.Create, token int64) (g *game, err error) {
	func() {
		gamesLock.Lock()
		defer gamesLock.Unlock()

		for {
			id := rand.Int63n(idMax)
			_, found := games[id]
			if !found {
				g = &game{
					id:       id,
					romImage: msg.RomImage,
					joinCh:   make(chan joinRequest),
					updateCh: make(chan updateRequest),
					timeout:  time.NewTimer(joinTimeout),
				}
				g.players[0] = conn
				games[id] = g
				break
			}
		}
	}()

	log.Println("Created game", g.id)
	go g.run(token)
	return
}

func joinGame(conn *websocket.Conn, msg *api.Join, token int64) (g *game, err error) {
	var ok bool
	func() {
		gamesLock.Lock()
		defer gamesLock.Unlock()
		g, ok = games[msg.Id]
	}()

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

func (g *game) run(createToken int64) {
	// window of updates
	var updates [delayFrames][2]updateRequest
	// lowest tick in window (tick-1 is the last tick synced)
	var tick int64 = 0

	defer g.cleanup()

	var err error
	defer func() {
		if err != nil {
			log.Println(err)
		}
	}()

	err = writeApiMessage(g.players[0], api.AckCreate{Id: g.id, Player: 0}, createToken, writeTimeout)
	if err != nil {
		return
	}

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
				writeApiMessage(join.conn, api.AckJoin{Error: &joinErr}, join.token, writeTimeout)
				continue
			}

			g.players[1] = join.conn
			join.resultCh <- writeApiMessage(join.conn, api.AckJoin{
				Error:    nil,
				Player:   1,
				RomImage: &g.romImage,
			}, join.token, writeTimeout)

			// both players joined, start
			g.timeout.Reset(syncTimeout)
			g.gameStarted = true
			err := g.broadcastMsg(api.Start{Delay: delayFrames}, writeTimeout)
			if err != nil {
				return
			}

		case update := <-g.updateCh:
			// check that tick is inside update window
			if update.tick < tick || update.tick >= tick+delayFrames {
				err = fmt.Errorf("Unexpected tick %d (supposed to be between %d and %d inclusive)",
					update.tick, tick, tick+delayFrames-1)
				return
			}

			// update keystrokes
			for idx, player := range g.players {
				if player == update.conn {
					updates[update.tick%delayFrames][idx] = update
				}
			}

			// try to send syncs
			for {
				mt := tick % delayFrames
				sync := true
				for idx := range updates[mt] {
					if !updates[mt][idx].present {
						sync = false
					}
				}
				if !sync {
					break
				}

				g.timeout.Reset(syncTimeout)
				for idx := range updates[mt] {
					updates[mt][idx].present = false
				}

				err := g.broadcastMsg(api.Sync{
					KeysDown: [2]string{updates[mt][0].keysDown, updates[mt][1].keysDown},
					Tick:     tick,
				}, writeTimeout)
				if err != nil {
					return
				}

				tick++
			}
		case <-g.timeout.C:
			return
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
	g.broadcastMsg(api.Finish{}, writeTimeout)

	gamesLock.Lock()
	defer gamesLock.Unlock()
	delete(games, g.id)
}

func (g *game) broadcastMsg(msg interface{}, timeout time.Duration) (err error) {
	for _, player := range g.players {
		var merr error
		if player != nil {
			merr = writeApiMessage(player, msg, 0, timeout)
		}
		if merr != nil {
			err = merr
		}
	}
	return
}
