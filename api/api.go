package api

const ApiVersion = 1

// server -> client messages
type ServerInfo struct {
	ApiVersion int `json:"api_version"`
}

type AckCreate struct {
	Id     int64 `json:"id"`
	Player int   `json:"player"`
}

type AckJoin struct {
	Error  error `json:"error"`
	Player int   `json:"player"`
}

type Start struct {
	// nothing
}

type Sync struct {
	KeysDown [2]string `json:"keys_down"`
	Tick     int64     `json:"tick"`
}

type Finish struct {
}

// client -> server messages
type Create struct {
}

type Join struct {
	Id int64 `json:"id"`
}

type Update struct {
	KeysDown string `json:"keys_down"`
	Tick     int64  `json:"tick"`
}
