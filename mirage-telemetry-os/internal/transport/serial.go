package transport

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	serial "go.bug.st/serial"
)

// ELMSerial is a prompt-delimited serial transport. It contains no OBD policy;
// unsafe requests are rejected by the adapter layer before reaching Exchange.
type ELMSerial struct {
	Port, LastCommand string
	Baud              int
	Timeout           time.Duration
	mu                sync.Mutex
	device            serial.Port
}

func NewELMSerial(port string, baud int, timeout time.Duration) *ELMSerial {
	return &ELMSerial{Port: port, Baud: baud, Timeout: timeout}
}
func (s *ELMSerial) Open(context.Context) error {
	device, err := serial.Open(s.Port, &serial.Mode{BaudRate: s.Baud, DataBits: 8, Parity: serial.NoParity, StopBits: serial.OneStopBit})
	if err != nil {
		return err
	}
	_ = device.SetReadTimeout(100 * time.Millisecond)
	s.device = device
	return nil
}
func (s *ELMSerial) Close() error {
	if s.device == nil {
		return nil
	}
	return s.device.Close()
}
func (s *ELMSerial) Exchange(ctx context.Context, command string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.device == nil {
		return nil, fmt.Errorf("serial port is not open")
	}
	s.LastCommand = command
	if _, err := s.device.Write([]byte(command + "\r")); err != nil {
		return nil, err
	}
	deadline := time.Now().Add(s.Timeout)
	var response bytes.Buffer
	buffer := make([]byte, 256)
	for time.Now().Before(deadline) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		n, err := s.device.Read(buffer)
		if n > 0 {
			response.Write(buffer[:n])
			if bytes.Contains(response.Bytes(), []byte(">")) {
				return cleanLines(response.String(), command), nil
			}
		}
		if err != nil {
			return nil, err
		}
	}
	return nil, fmt.Errorf("serial response timeout after %s", s.Timeout)
}
func cleanLines(raw, command string) []string {
	raw = strings.ReplaceAll(raw, ">", "")
	lines := strings.FieldsFunc(raw, func(r rune) bool { return r == '\r' || r == '\n' })
	out := []string{}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.EqualFold(line, command) {
			continue
		}
		out = append(out, line)
	}
	return out
}
