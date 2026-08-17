package main

import "testing"

func TestHasOBDReply(t *testing.T) {
	if !hasOBDReply([]string{"SEARCHING...", "7E8 06 41 00 BE 3E A8 13"}) {
		t.Fatal("expected Mode 01 PID 00 reply")
	}
	if hasOBDReply([]string{"NO DATA"}) {
		t.Fatal("NO DATA must not count as an OBD reply")
	}
}

func TestHasUDSReply(t *testing.T) {
	if !hasUDSReply([]string{"18DAF110 62 F4 0C 0D C0"}) {
		t.Fatal("expected OBD-on-UDS response")
	}
	if hasUDSReply([]string{"NO DATA"}) {
		t.Fatal("NO DATA must not be treated as an OBD-on-UDS response")
	}
}

func TestHasCANFrame(t *testing.T) {
	if hasCANFrame([]string{"STOPPED"}) {
		t.Fatal("ELM monitor terminator must not count as CAN traffic")
	}
	if !hasCANFrame([]string{"17F00010201000000000"}) {
		t.Fatal("expected hexadecimal CAN frame")
	}
}
