package user

import "time"

type Usage struct {
	TotalMinutes     int       `json:"total_minutes"`
	UsedMinutes      int       `json:"used_minutes"`
	RemainingMinutes int       `json:"remaining_minutes"`
	LastUpdated      time.Time `json:"last_updated"`
}
