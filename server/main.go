package main

import (
	"fmt"
	"github.com/dchen496/mpgb/api"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)

func main() {
	r := mux.NewRouter()

	// Everything is a WebSockets RPC for simplicity
	r.HandleFunc("/ws", wsHandler)

	// Serve static files
	r.PathPrefix("/js").Handler(http.FileServer(http.Dir("./js/")))
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))

	http.Handle("/", r)
	http.ListenAndServe(":8080", nil)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// send server info
	sinfo := api.ServerInfo{
		ApiVersion: api.ApiVersion,
	}

	err = writeApiMessage(conn, sinfo)
	if err != nil {
		log.Println(err)
		return
	}

	// wait for client to either create a game or join a game
	msg, err := readApiMessage(conn)
	if err != nil {
		log.Println(err)
		return
	}

	var g *game
	var playerIdx int
	var joinErr error

	switch msg := msg.(type) {
	case *api.Create:
		g, playerIdx = createGame(conn, msg)
		err = writeApiMessage(conn, api.AckCreate{Id: g.id, Player: playerIdx})
		if err != nil {
			return
		}
	case *api.Join:
		g, playerIdx, joinErr = joinGame(conn, msg)
		err = writeApiMessage(conn, api.AckJoin{
			Error:    joinErr,
			Player:   playerIdx,
			RomImage: g.romImage,
		})
		if err != nil {
			return
		}
	default:
		log.Println("Client did not create or join a game.")
		return
	}

	for {
		msg, err := readApiMessage(conn)
		if err != nil {
			log.Println(err)
			return
		}
		switch msg := msg.(type) {
		case *api.Update:
			g.update(conn, msg)
		default:
			log.Println("Unexpected message type.")
		}
	}
}

func writeApiMessage(conn *websocket.Conn, msg interface{}) (err error) {
	enc, err := api.EncodeMessage(msg)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.TextMessage, enc)
}

func readApiMessage(conn *websocket.Conn) (msg interface{}, err error) {
	messageType, p, err := conn.ReadMessage()
	if err != nil {
		return
	}
	if messageType != websocket.TextMessage {
		err = fmt.Errorf("Unexpected websocket message type.")
		return
	}
	msg, err = api.DecodeMessage(p)
	return
}
