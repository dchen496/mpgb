package api

import (
	"encoding/json"
	"fmt"
)

type message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func DecodeMessage(in []byte) (out interface{}, err error) {
	var m message
	err = json.Unmarshal(in, &m)
	if err != nil {
		return
	}

	switch m.Type {
	case "create":
		out = new(Create)
	case "join":
		out = new(Join)
	default:
		err = fmt.Errorf("Unrecognized message type %d.", m.Type)
		return
	}

	err = json.Unmarshal(m.Data, out)
	return
}

func EncodeMessage(in interface{}) (out []byte, err error) {
	var m message

	switch in.(type) {
	case ServerInfo:
		m.Type = "server_info"
	case AckCreate:
		m.Type = "ack_create"
	case AckJoin:
		m.Type = "ack_join"
	case Start:
		m.Type = "start"
	case Sync:
		m.Type = "sync"
	default:
		err = fmt.Errorf("Unrecognized message type.")
		return
	}

	data, err := json.Marshal(in)
	if err != nil {
		return
	}
	m.Data = json.RawMessage(data)
	out, err = json.Marshal(data)
	return
}
