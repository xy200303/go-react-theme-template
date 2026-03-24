package response

type PolicyTemplateResp struct {
	Key         string `json:"key"`
	MenuKey     string `json:"menu_key"`
	MenuLabel   string `json:"menu_label"`
	ActionLabel string `json:"action_label"`
	Description string `json:"description,omitempty"`
	Method      string `json:"method"`
	Path        string `json:"path"`
}
