---
name: "speckit-plan"
description: "Creates a technical implementation plan. Invoke after creating a specification to define how to build it."
---

# speckit.plan

Creates a technical implementation plan for a specification.

## Usage
`/speckit.plan [tech stack and architecture choices]`

## Description
This command creates a technical implementation plan based on a specification. It defines the technology stack, architecture, and implementation approach for building the specified feature.

## Examples
- `/speckit.plan The application uses Vite with minimal number of libraries. Use vanilla HTML, CSS, and JavaScript as much as possible. Images are not uploaded anywhere and metadata is stored in a local SQLite database.`
- `/speckit.plan Use React with TypeScript for the frontend, Node.js with Express for the backend, and PostgreSQL for the database.`

## Output
Creates an implementation plan in `specs/[feature-name]/plan.md` based on the provided technical choices.