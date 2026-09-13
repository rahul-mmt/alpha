import type { WorkflowState } from "./types";

const t = (d: string, h = "09:00") => `${d}T${h}:00.000Z`;

/**
 * Illustrative demo content for a peripheral vascular-access device.
 * Replace with real DHF content when wiring to the backend.
 */
export const SEED: WorkflowState = {
  mechanisms: [
    {
      id: "moa-1",
      unmetNeed:
        "Reduce catheter-related bloodstream infections (CRBSI) in peripheral IV placements dwelling > 72 h.",
      improvementConfirmed: true,
      theories: [
        {
          id: "thy-1a",
          title: "Biofilm suppression",
          file: {
            name: "Biofilm-mechanism-whitepaper.pdf",
            size: 842_311,
            type: "application/pdf",
            addedAt: t("2026-07-15", "14:18"),
          },
          statement:
            "Microbial colonisation of the external catheter surface is the dominant CRBSI pathway. Suppressing biofilm adhesion at the surface lowers infection incidence.",
          references: [
            {
              id: "ref-1",
              kind: "guideline",
              citation:
                "O'Grady NP et al. CDC Guidelines for the Prevention of Intravascular Catheter-Related Infections, 2011",
            },
            { id: "ref-2", kind: "journal", citation: "Mermel LA. Clin Infect Dis. 2011;52(2):211–212" },
            { id: "ref-3", kind: "internal", citation: "Literature review LR-07 (rev 2)" },
          ],
        },
        {
          id: "thy-1b",
          title: "Hub ingress",
          statement:
            "Intraluminal contamination via the hub during access events is a secondary pathway. Reducing open-air exposure and swabbable surface area lowers ingress.",
          references: [
            { id: "ref-4", kind: "journal", citation: "Safdar N, Maki DG. Intensive Care Med. 2004;30(1):62–67" },
            { id: "ref-5", kind: "standard", citation: "ISO 80369-7:2021 Small-bore connectors" },
          ],
        },
      ],
      status: "green",
      provenance: {
        procedureId: "PR-0102",
        procedureRevision: "B",
        sectionId: "S-4.1",
        sectionRevision: "3",
        cardRevision: "v4",
        revisionDate: "2026-08-21",
        activeConflict: false,
      },
      history: [
        { id: "ev-1", at: t("2026-07-02"), type: "created", summary: "Card created" },
        { id: "ev-2", at: t("2026-07-15", "14:20"), type: "edited", summary: "Clinical theory 'Biofilm suppression' revised" },
        {
          id: "ev-3",
          at: t("2026-08-21", "16:05"),
          type: "status",
          summary: "Status changed In review → Approved",
          signOff: {
            reviewer: "Dr. A. Okafor",
            role: "Clinical",
            rationale: "Both theories supported by cited guidelines; references verified against the DHF index.",
            from: "amber",
            to: "green",
            revision: "v4",
          },
        },
      ],
    },
    {
      id: "moa-2",
      unmetNeed:
        "Improve first-attempt cannulation success in patients with difficult venous access (DIVA).",
      improvementConfirmed: true,
      theories: [
        {
          id: "thy-2a",
          title: "Vessel visualisation",
          statement:
            "Real-time visualisation of vessel depth and diameter increases first-stick success and reduces repeat punctures.",
          references: [
            { id: "ref-6", kind: "journal", citation: "Stolz LA et al. J Vasc Access. 2015;16(4):321–326" },
            { id: "ref-7", kind: "journal", citation: "van Loon FHJ et al. Medicine. 2016;95(16)" },
            { id: "ref-8", kind: "internal", citation: "Clinical advisory board minutes CAB-2026-03" },
          ],
        },
      ],
      status: "amber",
      provenance: {
        procedureId: "PR-0102",
        procedureRevision: "B",
        sectionId: "S-4.2",
        sectionRevision: "2",
        cardRevision: "v2",
        revisionDate: "2026-09-02",
        activeConflict: false,
      },
      history: [
        { id: "ev-4", at: t("2026-08-10"), type: "created", summary: "Card created" },
        {
          id: "ev-5",
          at: t("2026-09-02", "11:30"),
          type: "status",
          summary: "Status changed Blocked → In review",
          signOff: {
            reviewer: "M. Reyes",
            role: "Program Management",
            rationale: "Draft complete; routed to clinical for theory review.",
            from: "red",
            to: "amber",
            revision: "v2",
          },
        },
      ],
    },
  ],
  features: [
    {
      id: "feat-1",
      moaId: "moa-1",
      theoryId: "thy-1a",
      designTheory:
        "A silver-ion eluting polymer on the outer lumen disrupts bacterial membrane integrity for the full dwell period.",
      featureConcept:
        "Antimicrobial outer-lumen coating (chlorhexidine / silver sulfadiazine) applied to the catheter body.",
      supportDocuments: [
        { id: "doc-1", kind: "protocol", code: "DHF-0142", title: "Bench biofilm assay protocol" },
        { id: "doc-2", kind: "report", code: "TR-0088", title: "Coating durability test report" },
        { id: "doc-3", kind: "plan", code: "BC-11", title: "Biocompatibility plan" },
      ],
      status: "green",
      provenance: {
        procedureId: "PR-0102",
        procedureRevision: "B",
        sectionId: "S-5.1",
        sectionRevision: "3",
        cardRevision: "v5",
        revisionDate: "2026-08-28",
        activeConflict: false,
      },
      history: [
        { id: "ev-6", at: t("2026-07-20"), type: "created", summary: "Card created" },
        {
          id: "ev-7",
          at: t("2026-08-28", "10:12"),
          type: "status",
          summary: "Status changed In review → Approved",
          signOff: {
            reviewer: "S. Lindqvist",
            role: "Design Engineering",
            rationale: "Coating durability report TR-0088 released; concept traceable to theory 'Biofilm suppression'.",
            from: "amber",
            to: "green",
            revision: "v5",
          },
        },
      ],
    },
    {
      id: "feat-2",
      moaId: "moa-1",
      theoryId: "thy-1b",
      designTheory:
        "A closed, split-septum hub minimises open-air exposure and gives a flat, swabbable surface at every access.",
      featureConcept:
        "Integrated needleless closed connector with split-septum, flush-back-resistant valve.",
      supportDocuments: [
        { id: "doc-4", kind: "protocol", code: "DHF-0143", title: "Hub microbial ingress study" },
        { id: "doc-5", kind: "review", code: "CT-04", title: "Competitive teardown" },
      ],
      status: "red",
      provenance: {
        procedureId: "PR-0102",
        procedureRevision: "B",
        sectionId: "S-5.2",
        sectionRevision: "1",
        cardRevision: "v3",
        revisionDate: "2026-09-04",
        activeConflict: true,
        conflictReason: "Connector geometry conflicts with ISO 80369-7 luer envelope; awaiting regulatory read.",
      },
      history: [
        { id: "ev-8", at: t("2026-08-01"), type: "created", summary: "Card created" },
        {
          id: "ev-9",
          at: t("2026-09-04", "15:40"),
          type: "conflict",
          summary: "Conflict flagged: connector geometry conflicts with ISO 80369-7 luer envelope",
        },
        {
          id: "ev-10",
          at: t("2026-09-04", "15:45"),
          type: "status",
          summary: "Status changed In review → Blocked",
          signOff: {
            reviewer: "P. Nakamura",
            role: "Regulatory / Quality",
            rationale: "Blocked pending resolution of the ISO 80369-7 dimensional conflict.",
            from: "amber",
            to: "red",
            revision: "v3",
          },
        },
      ],
    },
    {
      id: "feat-3",
      moaId: "moa-2",
      theoryId: "thy-2a",
      designTheory:
        "Near-infrared light is absorbed by haemoglobin, so vessels render as dark bands when projected back onto the skin.",
      featureConcept: "Clip-on NIR vein visualiser projecting a vessel map onto the insertion site.",
      supportDocuments: [
        { id: "doc-6", kind: "report", code: "FS-19", title: "Feasibility study" },
        { id: "doc-7", kind: "review", code: "OS-02", title: "Optical safety assessment" },
      ],
      status: "amber",
      provenance: {
        procedureId: "PR-0102",
        procedureRevision: "B",
        sectionId: "S-5.3",
        sectionRevision: "1",
        cardRevision: "v1",
        revisionDate: "2026-09-05",
        activeConflict: false,
      },
      history: [
        { id: "ev-11", at: t("2026-09-05"), type: "created", summary: "Card created" },
        {
          id: "ev-12",
          at: t("2026-09-05", "12:00"),
          type: "status",
          summary: "Status changed Blocked → In review",
          signOff: {
            reviewer: "M. Reyes",
            role: "Program Management",
            rationale: "Feasibility study FS-19 attached; ready for design review.",
            from: "red",
            to: "amber",
            revision: "v1",
          },
        },
      ],
    },
  ],
};
