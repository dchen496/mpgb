package main

import (
	"github.com/dchen496/mpgb/server"
	"github.com/gorilla/mux"
	"log"
	"net/http"
)

func main() {
	r := mux.NewRouter()

	// Everything is a WebSockets RPC for simplicity
	r.HandleFunc("/ws", server.WsHandler)

	// Serve static files
	r.PathPrefix("/js/").Handler(http.StripPrefix("/js/", http.FileServer(http.Dir("./js/"))))
	r.PathPrefix("/roms/").Handler(http.StripPrefix("/roms/", http.FileServer(http.Dir("./roms/"))))
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))

	http.Handle("/", r)
	addr := ":8080"

	log.Printf("listening on %s\n", addr)
	http.ListenAndServe(addr, nil)
}
