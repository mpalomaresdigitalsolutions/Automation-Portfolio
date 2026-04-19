---
name: "speckit-specify"
description: "Creates a specification for what to build. Invoke when starting a new feature or project to define requirements."
---

# speckit.specify

Creates a specification describing what you want to build.

## Usage
`/speckit.specify [description]`

## Description
This command creates a specification document that describes what you want to build, focusing on the "what" and "why" rather than the technical implementation details. The specification will be saved in the `specs/` directory.

## Examples
- `/speckit.specify Build an application that can help me organize my photos in separate photo albums. Albums are grouped by date and can be re-organized by dragging and dropping on the main page.`
- `/speckit.specify Create a user authentication system with email/password login and social media integration`

## Output
Creates a specification document in `specs/[feature-name]/spec.md` based on the provided description.