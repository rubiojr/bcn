// update.go updates the cost and rating of a restaurant in restaurants.txt.
//
// Usage: go run update.go <search term> [file]
// Default file is restaurants.txt in the current directory.
//
// Rating: 0 = haven't been, 1 = ⭐, 2 = ⭐⭐, 3 = ⭐⭐⭐
// Cost:   0 = unknown, 1 = 💲 (10-30€), 2 = 💲💲 (30-60€), 3 = 💲💲💲 (60€+)
package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

const (
	fieldSep    = " # "
	numFields   = 5
	idxName     = 0
	idxCuisine  = 2
	idxRating   = 3
	idxCost     = 4
	maxRating   = 3
	maxCost     = 3
	defaultFile = "restaurants.txt"
)

var (
	ratingLabels = []string{"-", "⭐", "⭐⭐", "⭐⭐⭐"}
	costLabels   = []string{"-", "💲", "💲💲", "💲💲💲"}
	stdin        = bufio.NewReader(os.Stdin)
)

type restaurant struct {
	lineIndex int
	number    string
	fields    []string
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: go run update.go <search term> [file]")
		os.Exit(1)
	}

	query := os.Args[1]
	file := defaultFile
	if len(os.Args) > 2 {
		file = os.Args[2]
	}

	lines, err := readFileLines(file)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading %s: %v\n", file, err)
		os.Exit(1)
	}

	if len(lines) < 2 {
		fmt.Fprintln(os.Stderr, "file has no restaurant entries")
		os.Exit(1)
	}

	matches := findMatches(lines[1:], query)
	if len(matches) == 0 {
		fmt.Fprintf(os.Stderr, "no restaurants matching %q\n", query)
		os.Exit(1)
	}

	selected := matches[0]
	if len(matches) > 1 {
		selected, err = promptSelection(matches)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
	}

	name := strings.TrimSpace(selected.fields[idxName])
	rating, _ := strconv.Atoi(strings.TrimSpace(selected.fields[idxRating]))
	cost, _ := strconv.Atoi(strings.TrimSpace(selected.fields[idxCost]))

	fmt.Printf("\n%s  (Rating: %s, Cost: %s)\n\n", name, ratingLabels[rating], costLabels[cost])

	newRating, err := promptValue("Rating (0=haven't been, 1=⭐, 2=⭐⭐, 3=⭐⭐⭐)", rating, maxRating)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	newCost, err := promptValue("Cost (0=unknown, 1=💲 10-30€, 2=💲💲 30-60€, 3=💲💲💲 60€+)", cost, maxCost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	selected.fields[idxRating] = fmt.Sprintf(" %d", newRating)
	selected.fields[idxCost] = fmt.Sprintf(" %d", newCost)
	lines[selected.lineIndex+1] = selected.number + strings.Join(selected.fields, " #")

	if err := writeLines(file, lines); err != nil {
		fmt.Fprintf(os.Stderr, "error writing %s: %v\n", file, err)
		os.Exit(1)
	}

	fmt.Printf("\nUpdated %s  (Rating: %s, Cost: %s)\n", name, ratingLabels[newRating], costLabels[newCost])
}

func findMatches(lines []string, query string) []restaurant {
	q := strings.ToLower(query)
	var matches []restaurant
	for i, line := range lines {
		stripped := strings.TrimRight(line, " \t")
		if stripped == "" {
			continue
		}
		// Split off the "N. " prefix
		dotIdx := strings.Index(stripped, ". ")
		if dotIdx < 0 {
			continue
		}
		number := stripped[:dotIdx+2]
		rest := stripped[dotIdx+2:]

		fields := strings.SplitN(rest, " #", numFields)
		if len(fields) != numFields {
			continue
		}

		name := strings.ToLower(strings.TrimSpace(fields[idxName]))
		cuisine := strings.ToLower(strings.TrimSpace(fields[idxCuisine]))
		if strings.Contains(name, q) || strings.Contains(cuisine, q) {
			matches = append(matches, restaurant{lineIndex: i, number: number, fields: fields})
		}
	}
	return matches
}

func promptSelection(matches []restaurant) (restaurant, error) {
	fmt.Println("\nMatching restaurants:")
	for i, m := range matches {
		name := strings.TrimSpace(m.fields[idxName])
		cuisine := strings.TrimSpace(m.fields[idxCuisine])
		rating, _ := strconv.Atoi(strings.TrimSpace(m.fields[idxRating]))
		cost, _ := strconv.Atoi(strings.TrimSpace(m.fields[idxCost]))
		fmt.Printf("  %d. %s (%s) - Rating: %s, Cost: %s\n", i+1, name, cuisine, ratingLabels[rating], costLabels[cost])
	}
	fmt.Printf("\nSelect [1-%d]: ", len(matches))

	text, err := stdin.ReadString('\n')
	if err != nil {
		return restaurant{}, fmt.Errorf("reading input: %w", err)
	}

	choice, err := strconv.Atoi(strings.TrimSpace(text))
	if err != nil || choice < 1 || choice > len(matches) {
		return restaurant{}, fmt.Errorf("invalid selection")
	}
	return matches[choice-1], nil
}

func promptValue(label string, current, max int) (int, error) {
	fmt.Printf("%s [%d]: ", label, current)

	text, err := stdin.ReadString('\n')
	if err != nil {
		return 0, fmt.Errorf("reading input: %w", err)
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return current, nil
	}

	val, err := strconv.Atoi(text)
	if err != nil || val < 0 || val > max {
		return 0, fmt.Errorf("value must be 0-%d", max)
	}
	return val, nil
}

func readFileLines(path string) ([]string, error) {
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

func writeLines(path string, lines []string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	w := bufio.NewWriter(f)
	for _, line := range lines {
		fmt.Fprintln(w, line)
	}
	return w.Flush()
}
