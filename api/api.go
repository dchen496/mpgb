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
	Error    *string `json:"error"`
	Player   int     `json:"player"`
	RomImage *string `json:"rom_image"`
}

type Start struct {
	Delay int `json:"delay"`
}

type Sync struct {
	KeysDown [2]string `json:"keys_down"`
	Tick     int64     `json:"tick"`
}

type Finish struct {
}

// client -> server messages
type Create struct {
	Name     string `json:"name"`
	RomImage string `json:"rom_image"`
}

type Join struct {
	Id int64 `json:"id"`
}

type Update struct {
	KeysDown string `json:"keys_down"`
	Tick     int64  `json:"tick"`
}
