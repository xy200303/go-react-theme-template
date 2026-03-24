package policytemplate

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"

	"backend/internal/models/dto/response"
)

//go:generate go run gen_openapi.go

//go:embed openapi.json
var embeddedOpenAPI []byte

type openAPIDocument struct {
	Tags  []openAPITag        `json:"tags"`
	Paths map[string]pathItem `json:"paths"`
}

type openAPITag struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type pathItem map[string]operationItem

type operationItem struct {
	Summary     string   `json:"summary"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	OperationID string   `json:"operationId"`
}

var (
	loadOnce  sync.Once
	loadErr   error
	templates []response.PolicyTemplateResp
)

func List() []response.PolicyTemplateResp {
	loadOnce.Do(func() {
		templates, loadErr = parseOpenAPI(embeddedOpenAPI)
	})
	if loadErr != nil {
		panic(fmt.Sprintf("failed to parse embedded policy openapi.json: %v", loadErr))
	}

	result := make([]response.PolicyTemplateResp, len(templates))
	copy(result, templates)
	return result
}

func parseOpenAPI(content []byte) ([]response.PolicyTemplateResp, error) {
	var spec openAPIDocument
	if err := json.Unmarshal(content, &spec); err != nil {
		return nil, err
	}

	tagLabels := make(map[string]string, len(spec.Tags))
	for _, tag := range spec.Tags {
		tagLabels[tag.Name] = tag.Description
	}

	templates := make([]response.PolicyTemplateResp, 0)
	for path, operations := range spec.Paths {
		for method, operation := range operations {
			if operation.OperationID == "" || operation.Summary == "" || len(operation.Tags) == 0 {
				continue
			}

			menuKey := operation.Tags[0]
			menuLabel := tagLabels[menuKey]
			if menuLabel == "" {
				continue
			}

			templates = append(templates, response.PolicyTemplateResp{
				Key:         operation.OperationID,
				MenuKey:     menuKey,
				MenuLabel:   menuLabel,
				ActionLabel: operation.Summary,
				Description: operation.Description,
				Method:      strings.ToUpper(method),
				Path:        convertOpenAPIPathToGinPath(path),
			})
		}
	}

	sortPolicyTemplates(templates)
	return templates, nil
}

func convertOpenAPIPathToGinPath(path string) string {
	var builder strings.Builder
	for i := 0; i < len(path); i++ {
		if path[i] != '{' {
			builder.WriteByte(path[i])
			continue
		}

		end := strings.IndexByte(path[i:], '}')
		if end == -1 {
			builder.WriteByte(path[i])
			continue
		}

		builder.WriteByte(':')
		builder.WriteString(path[i+1 : i+end])
		i += end
	}

	return builder.String()
}

func sortPolicyTemplates(templates []response.PolicyTemplateResp) {
	sort.Slice(templates, func(i, j int) bool {
		if templates[i].Path != templates[j].Path {
			return templates[i].Path < templates[j].Path
		}
		if templates[i].Method != templates[j].Method {
			return templates[i].Method < templates[j].Method
		}
		return templates[i].Key < templates[j].Key
	})
}
