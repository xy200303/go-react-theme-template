//go:build ignore

package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type operationDoc struct {
	ID          string
	Summary     string
	Description string
	Tags        []string
	Path        string
	Method      string
}

type openAPIDocument struct {
	OpenAPI string              `json:"openapi"`
	Info    openAPIInfo         `json:"info"`
	Tags    []openAPITag        `json:"tags,omitempty"`
	Paths   map[string]pathItem `json:"paths"`
}

type openAPIInfo struct {
	Title   string `json:"title"`
	Version string `json:"version"`
}

type openAPITag struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

type pathItem map[string]operationItem

type operationItem struct {
	Summary     string   `json:"summary,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	OperationID string   `json:"operationId,omitempty"`
}

var menuLabels = map[string]string{
	"configs":   "系统配置",
	"dashboard": "仪表盘",
	"profile":   "个人中心",
	"roles":     "角色管理",
	"users":     "用户管理",
}

func main() {
	root, err := findModuleRoot()
	if err != nil {
		exitWithError(err)
	}

	operations, err := collectOperations(root)
	if err != nil {
		exitWithError(err)
	}

	spec := buildOpenAPIDocument(operations)
	openAPIPath := filepath.Join(root, "generate", "openapi.json")
	if err := writeOpenAPIFile(openAPIPath, spec); err != nil {
		exitWithError(err)
	}
}

func collectOperations(root string) ([]operationDoc, error) {
	controllersDir := filepath.Join(root, "internal", "api", "controllers")
	files, err := os.ReadDir(controllersDir)
	if err != nil {
		return nil, err
	}

	fset := token.NewFileSet()
	operations := make([]operationDoc, 0)

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".go") || strings.HasSuffix(file.Name(), "_test.go") {
			continue
		}

		filename := filepath.Join(controllersDir, file.Name())
		parsedFile, err := parser.ParseFile(fset, filename, nil, parser.ParseComments)
		if err != nil {
			return nil, err
		}

		for _, decl := range parsedFile.Decls {
			fn, ok := decl.(*ast.FuncDecl)
			if !ok || fn.Recv == nil || fn.Doc == nil {
				continue
			}

			operation, ok, err := parseOperationDoc(fn.Doc, fn.Name.Name)
			if err != nil {
				return nil, err
			}
			if !ok {
				continue
			}

			operations = append(operations, operation)
		}
	}

	sort.Slice(operations, func(i, j int) bool {
		if operations[i].Path == operations[j].Path {
			return operations[i].Method < operations[j].Method
		}
		return operations[i].Path < operations[j].Path
	})

	return operations, nil
}

func parseOperationDoc(doc *ast.CommentGroup, funcName string) (operationDoc, bool, error) {
	operation := operationDoc{}
	found := false

	for _, comment := range doc.List {
		line := strings.TrimSpace(strings.TrimPrefix(comment.Text, "//"))
		if line == "" {
			continue
		}

		if value, ok := parseAnnotation(line, "@Summary"); ok {
			operation.Summary = value
			found = true
			continue
		}
		if value, ok := parseAnnotation(line, "@Description"); ok {
			operation.Description = value
			found = true
			continue
		}
		if value, ok := parseAnnotation(line, "@Tags"); ok {
			operation.Tags = parseTags(value)
			found = true
			continue
		}
		if value, ok := parseAnnotation(line, "@ID"); ok {
			operation.ID = value
			found = true
			continue
		}
		if value, ok := parseAnnotation(line, "@Router"); ok {
			path, method, err := parseRouterAnnotation(value)
			if err != nil {
				return operationDoc{}, false, fmt.Errorf("%s: %w", funcName, err)
			}
			operation.Path = path
			operation.Method = method
			found = true
		}
	}

	if !found {
		return operationDoc{}, false, nil
	}

	if operation.ID == "" || operation.Summary == "" || len(operation.Tags) == 0 || operation.Path == "" || operation.Method == "" {
		return operationDoc{}, false, fmt.Errorf("%s: incomplete OpenAPI annotations", funcName)
	}

	if _, ok := menuLabels[operation.Tags[0]]; !ok {
		return operationDoc{}, false, fmt.Errorf("%s: unknown tag %q", funcName, operation.Tags[0])
	}

	return operation, true, nil
}

func parseAnnotation(line, tag string) (string, bool) {
	if line == tag {
		return "", true
	}

	prefix := tag + " "
	if !strings.HasPrefix(line, prefix) {
		return "", false
	}

	return strings.TrimSpace(strings.TrimPrefix(line, prefix)), true
}

func parseTags(value string) []string {
	parts := strings.Split(value, ",")
	tags := make([]string, 0, len(parts))
	for _, part := range parts {
		tag := strings.TrimSpace(part)
		if tag == "" {
			continue
		}
		tags = append(tags, tag)
	}
	return tags
}

func parseRouterAnnotation(value string) (string, string, error) {
	parts := strings.Fields(value)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid @Router value %q", value)
	}

	path := parts[0]
	method := strings.TrimPrefix(strings.TrimSuffix(parts[1], "]"), "[")
	if path == "" || method == "" {
		return "", "", fmt.Errorf("invalid @Router value %q", value)
	}

	return path, strings.ToLower(method), nil
}

func buildOpenAPIDocument(operations []operationDoc) openAPIDocument {
	tags := make([]openAPITag, 0, len(menuLabels))
	keys := make([]string, 0, len(menuLabels))
	for key := range menuLabels {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		tags = append(tags, openAPITag{
			Name:        key,
			Description: menuLabels[key],
		})
	}

	paths := make(map[string]pathItem)
	for _, operation := range operations {
		if _, ok := paths[operation.Path]; !ok {
			paths[operation.Path] = pathItem{}
		}
		paths[operation.Path][operation.Method] = operationItem{
			Summary:     operation.Summary,
			Description: operation.Description,
			Tags:        operation.Tags,
			OperationID: operation.ID,
		}
	}

	return openAPIDocument{
		OpenAPI: "3.0.3",
		Info: openAPIInfo{
			Title:   "Policy Template API",
			Version: "1.0.0",
		},
		Tags:  tags,
		Paths: paths,
	}
}

func writeOpenAPIFile(path string, spec openAPIDocument) error {
	data, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		return err
	}

	data = append(data, '\n')
	return os.WriteFile(path, data, 0o644)
}

func findModuleRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("go.mod not found")
		}
		dir = parent
	}
}

func exitWithError(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
