package api

import (
	"encoding/json"
	"fmt"
)

type message struct {
	Type  string           `json:"type"`  // the message type - see api.go
	Data  *json.RawMessage `json:"data"`  // the actual message
	Token int64            `json:"token"` // a token used to match request/response pairs, or 0 if not in a pair
}

func DecodeMessage(in []byte) (out interface{}, token int64, err error) {
	var m message
	err = json.Unmarshal(in, &m)
	if err != nil {
		return
	}
	token = m.Token

	switch m.Type {
	case "create":
		out = new(Create)
	case "join":
		out = new(Join)
	case "update":
		out = new(Update)
	default:
		err = fmt.Errorf("Unrecognized message type %d.", m.Type)
		return
	}

	data, _ := m.Data.MarshalJSON()
	err = json.Unmarshal(data, out)
	return
}

func EncodeMessage(in interface{}, token int64) (out []byte, err error) {
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
	m.Token = token

	data, err := json.Marshal(in)
	if err != nil {
		return
	}
	raw := json.RawMessage(data)
	m.Data = &raw
	out, err = json.Marshal(m)
	return
}
