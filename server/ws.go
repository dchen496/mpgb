package server

import (
	"fmt"
	"github.com/dchen496/mpgb/api"
	"github.com/gorilla/websocket"
	"log"
)

func limit(str string) string {
	if len(str) > 100 {
		return str[:97] + "..."
	}
	return str
}
func writeApiMessage(conn *websocket.Conn, msg interface{}, token int64) (err error) {
	enc, err := api.EncodeMessage(msg, token)
	if err != nil {
		return err
	}
	log.Println("send", limit(string(enc)))
	return conn.WriteMessage(websocket.TextMessage, enc)
}

func readApiMessage(conn *websocket.Conn) (msg interface{}, token int64, err error) {
	messageType, p, err := conn.ReadMessage()
	if err != nil {
		return
	}
	if messageType != websocket.TextMessage {
		err = fmt.Errorf("Unexpected websocket message type.")
		return
	}
	log.Println("recv", limit(string(p)))
	msg, token, err = api.DecodeMessage(p)
	return
}
