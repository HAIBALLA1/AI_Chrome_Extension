# AI Autocomplete Chrome Extension

A Chrome Extension that provides AI-powered text suggestions in any text field or content-editable area on a webpage. It uses the OpenAI API to generate real-time completions, similar to a writing assistant.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Project Structure](#project-structure)
6. [Customization](#customization)
7. [Known Issues / Limitations](#known-issues--limitations)
  

---

## Overview
**AI Autocomplete Chrome Extension** enhances your writing workflow by suggesting text completions in real-time. Whether you’re composing emails, filling out forms, or commenting on YouTube, the extension displays inline suggestions to help you write faster and more efficiently.

**Key Goals**:
- Reduce repetitive typing
- Provide context-aware suggestions
- Work seamlessly across a variety of websites

---

## Features
- **Inline Suggestions**: Displays AI-generated text completions as you type.
- **Tab Completion**: Press the Tab key to accept the suggestion instantly.
- **ContentEditable Support**: Works with rich text editors like Gmail, YouTube comments, Notion, and more.
- **Debounce Mechanism**: Limits the frequency of API calls for optimal performance.
- **Dynamic Handling**: Uses `MutationObserver` to detect new text fields added to the page.
- **Overlay Positioning**: Precisely aligns suggestions to the cursor or input field.

---

## Installation

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/HAIBALLA1/AI_Chrome_Extension.git
