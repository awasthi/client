package libkb

import (
	"fmt"
	"sort"
	"strings"

	keybase1 "github.com/keybase/client/protocol/go"
	jsonw "github.com/keybase/go-jsonw"
)

type IdentifyOutcome struct {
	Username      string
	Error         error
	KeyDiffs      []TrackDiff
	Deleted       []TrackDiffDeleted
	ProofChecks   []*LinkCheckResult
	Warnings      []Warning
	TrackUsed     *TrackLookup
	TrackEqual    bool // Whether the track statement was equal to what we saw
	MeSet         bool // whether me was set at the time
	LocalOnly     bool
	ApproveRemote bool
	rpl           *RemoteProofLinks
}

func NewIdentifyOutcome(m bool) *IdentifyOutcome {
	return &IdentifyOutcome{
		MeSet: m,
	}
}

func (i *IdentifyOutcome) remoteProofLinks() *RemoteProofLinks {
	if i.rpl != nil {
		return i.rpl
	}
	i.rpl = NewRemoteProofLinks()
	for _, p := range i.ProofChecks {
		i.rpl.Insert(p.link, p.err)
	}
	return i.rpl
}

func (i *IdentifyOutcome) ActiveProofs() []RemoteProofChainLink {
	return i.remoteProofLinks().Active()
}

func (i *IdentifyOutcome) AddProofsToSet(existing *ProofSet) {
	i.remoteProofLinks().AddProofsToSet(existing)
}

func (i *IdentifyOutcome) TrackSet() *TrackSet {
	return i.remoteProofLinks().TrackSet()
}

func (i *IdentifyOutcome) ProofChecksSorted() []*LinkCheckResult {
	m := make(map[keybase1.ProofType][]*LinkCheckResult)
	for _, p := range i.ProofChecks {
		pt := p.link.GetProofType()
		m[pt] = append(m[pt], p)
	}

	var res []*LinkCheckResult
	for _, pt := range RemoteServiceOrder {
		pc, ok := m[pt]
		if !ok {
			continue
		}
		sort.Sort(byDisplayString(pc))
		res = append(res, pc...)
	}
	return res
}

func (i IdentifyOutcome) NumDeleted() int {
	return len(i.Deleted)
}

func (i IdentifyOutcome) NumProofFailures() int {
	nfails := 0
	for _, c := range i.ProofChecks {
		if c.err != nil {
			nfails++
		}
	}
	return nfails
}

func (i IdentifyOutcome) NumProofSuccesses() int {
	nsucc := 0
	for _, c := range i.ProofChecks {
		if c.err == nil {
			nsucc++
		}
	}
	return nsucc
}

func (i IdentifyOutcome) NumTrackFailures() int {
	ntf := 0
	check := func(d TrackDiff) bool {
		return d != nil && d.BreaksTracking()
	}
	for _, c := range i.ProofChecks {
		if check(c.diff) || check(c.remoteDiff) {
			fmt.Printf("proof check track failure: %+v\n", c)
			fmt.Printf("hint: %+v\n", c.hint)
			fmt.Printf("diff type: %T\n", c.remoteDiff)
			ntf++
		}
	}

	for _, k := range i.KeyDiffs {
		if check(k) {
			ntf++
		}
	}

	return ntf
}

func (i IdentifyOutcome) NumTrackChanges() int {
	ntc := 0
	check := func(d TrackDiff) bool {
		return d != nil && !d.IsSameAsTracked()
	}
	for _, c := range i.ProofChecks {
		if check(c.diff) || check(c.remoteDiff) {
			ntc++
		}
	}
	for _, k := range i.KeyDiffs {
		if check(k) {
			ntc++
		}
	}
	return ntc
}

func (i IdentifyOutcome) TrackStatus() keybase1.TrackStatus {
	if i.NumTrackFailures() > 0 || i.NumDeleted() > 0 {
		return keybase1.TrackStatus_UPDATE_BROKEN
	}
	if i.TrackUsed != nil {
		if i.NumTrackChanges() > 0 {
			return keybase1.TrackStatus_UPDATE_NEW_PROOFS
		}
		if i.NumTrackChanges() == 0 {
			return keybase1.TrackStatus_UPDATE_OK
		}
	}
	if i.NumProofSuccesses() == 0 {
		return keybase1.TrackStatus_NEW_ZERO_PROOFS
	}
	if i.NumProofFailures() > 0 {
		return keybase1.TrackStatus_NEW_FAIL_PROOFS
	}
	return keybase1.TrackStatus_NEW_OK
}

func (i IdentifyOutcome) TrackingStatement() *jsonw.Wrapper {
	return i.remoteProofLinks().TrackingStatement()
}

func (i IdentifyOutcome) GetErrorAndWarnings(strict bool) (warnings Warnings, err error) {

	if i.Error != nil {
		err = i.Error
		return
	}

	var probs []string

	softErr := func(s string) {
		if strict {
			probs = append(probs, s)
		} else {
			warnings.Push(StringWarning(s))
		}
	}

	for _, deleted := range i.Deleted {
		softErr(deleted.ToDisplayString())
	}

	if nfails := i.NumProofFailures(); nfails > 0 {
		p := fmt.Sprintf("PROBLEM: %d proof%s failed remote checks", nfails, GiveMeAnS(nfails))
		softErr(p)
	}

	if ntf := i.NumTrackFailures(); ntf > 0 {
		probs = append(probs,
			fmt.Sprintf("%d track component%s failed",
				ntf, GiveMeAnS(ntf)))
	}

	if len(probs) > 0 {
		err = fmt.Errorf("%s", strings.Join(probs, ";"))
	}

	return
}

func (i IdentifyOutcome) GetError() error {
	_, e := i.GetErrorAndWarnings(true)
	return e
}

func (i IdentifyOutcome) GetErrorLax() (Warnings, error) {
	return i.GetErrorAndWarnings(true)
}

type byDisplayString []*LinkCheckResult

func (a byDisplayString) Len() int      { return len(a) }
func (a byDisplayString) Swap(i, j int) { a[i], a[j] = a[j], a[i] }
func (a byDisplayString) Less(i, j int) bool {
	return a[i].link.ToDisplayString() < a[j].link.ToDisplayString()
}
