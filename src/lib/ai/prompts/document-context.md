---
name: document-context
description: The documents the user selected, given to the model with the question
version: "1.0"
variables: [documents]
---

[Active Document Context]
The user has provided the following document content for reference in this conversation. If you need to perform specific extraction tools, use the provided Document IDs. Articles marked [Dn] are cited by that id only.

{{documents}}

[End of Document Context]
