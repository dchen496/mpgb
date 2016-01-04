package server

import (
	"fmt"
	"github.com/dchen496/mpgb/api"
	"github.com/gorilla/websocket"
	"log"
	"time"
)

const debugMessages = false

func limit(str string) string {
	if len(str) > 100 {
		return str[:97] + "..."
	}
	return str
}

func writeApiMessage(conn *websocket.Conn, msg interface{}, token int64, timeout time.Duration) (err error) {
	conn.SetWriteDeadline(time.Now().Add(timeout))
	enc, err := api.EncodeMessage(msg, token)
	if err != nil {
		return err
	}
	if debugMessages {
		log.Println("send", conn.RemoteAddr(), limit(string(enc)))
	}
	return conn.WriteMessage(websocket.TextMessage, enc)
}

func readApiMessage(conn *websocket.Conn, timeout time.Duration) (msg interface{}, token int64, err error) {
	conn.SetReadDeadline(time.Now().Add(timeout))
	messageType, p, err := conn.ReadMessage()
	if err != nil {
		return
	}
	if messageType != websocket.TextMessage {
		err = fmt.Errorf("Unexpected websocket message type.")
		return
	}
	if debugMessages {
		log.Println("recv", conn.RemoteAddr(), limit(string(p)))
	}
	msg, token, err = api.DecodeMessage(p)
	return
}
