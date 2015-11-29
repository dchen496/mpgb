package server

import (
	"github.com/dchen496/mpgb/api"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func WsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// send server info
	sinfo := api.ServerInfo{
		ApiVersion: api.ApiVersion,
	}

	err = writeApiMessage(conn, sinfo, 0)
	if err != nil {
		log.Println(err)
		return
	}

	// wait for client to either create a game or join a game
	msg, token, err := readApiMessage(conn)
	if err != nil {
		log.Println(err)
		return
	}

	var g *game

	switch msg := msg.(type) {
	case *api.Create:
		g, err = createGame(conn, msg, token)
		if err != nil {
			return
		}
	case *api.Join:
		g, err = joinGame(conn, msg, token)
		if err != nil {
			return
		}
	default:
		log.Println("Client did not create or join a game.")
		return
	}

	for {
		msg, _, err := readApiMessage(conn)
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
