// sort.go sorts restaurants.txt alphabetically, preserving the header,
// renumbering entries, and stripping trailing whitespace.
//
// Usage: go run sort.go [file]
// Default file is restaurants.txt in the current directory.
package main

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"
)

var numberPrefix = regexp.MustCompile(`^\d+\.\s+`)

func main() {
	file := "restaurants.txt"
	if len(os.Args) > 1 {
		file = os.Args[1]
	}

	lines, err := readLines(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading %s: %v\n", file, err)
		os.Exit(1)
	}

	if len(lines) < 2 {
		fmt.Fprintln(os.Stderr, "file has no restaurant entries")
		os.Exit(1)
	}

	header := strings.TrimRight(lines[0], " \t")
	entries := make([]string, 0, len(lines)-1)
	for _, line := range lines[1:] {
		stripped := strings.TrimRight(line, " \t")
		if stripped == "" {
			continue
		}
		// Remove existing number prefix
		stripped = numberPrefix.ReplaceAllString(stripped, "")
		entries = append(entries, stripped)
	}

	sort.Slice(entries, func(i, j int) bool {
		return strings.ToLower(entries[i]) < strings.ToLower(entries[j])
	})

	out, err := os.Create(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error writing %s: %v\n", file, err)
		os.Exit(1)
	}
	defer out.Close()

	w := bufio.NewWriter(out)
	fmt.Fprintln(w, header)
	for i, entry := range entries {
		fmt.Fprintf(w, "%d. %s\n", i+1, entry)
	}
	w.Flush()
}

func readLines(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var lines []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	return lines, scanner.Err()
}
