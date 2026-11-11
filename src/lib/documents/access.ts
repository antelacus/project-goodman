/**
 * Who may read a document by its id. One rule for every reader that takes an id
 * from a request (the preview link, the extract tool): library documents, and the
 * requester's own uploads; an admin reads everything. The chat's selected
 * documents are narrower: see isSelectableBy.
 */

export interface Requester {
  ownerType: 'admin' | 'user' | 'guest';
  ownerId: string | undefined;
}

export interface DocumentOwnership {
  doc_category: string | null;
  owner_type: string | null;
  owner_id: string | null;
}

/** The owner a session's uploads are stored under: a guest by session, a user by account. */
export function requesterOf(session: { role: 'admin' | 'user' | 'guest'; sessionId: string; userId?: string }): Requester {
  return { ownerType: session.role, ownerId: session.role === 'guest' ? session.sessionId : session.userId };
}

export function isOwnedBy(doc: Pick<DocumentOwnership, 'owner_type' | 'owner_id'>, requester: Partial<Requester>): boolean {
  return !!requester.ownerType && !!requester.ownerId && doc.owner_type === requester.ownerType && doc.owner_id === requester.ownerId;
}

export function isReadableBy(doc: DocumentOwnership, requester: Partial<Requester>): boolean {
  return requester.ownerType === 'admin' || doc.doc_category === 'knowledge' || isOwnedBy(doc, requester);
}

/**
 * A document the chat may number as the user's own (D ids): only the requester's
 * uploads, never a library document, even one an admin uploaded, whose regulations
 * would otherwise be shown as 「您上传的文档」.
 */
export function isSelectableBy(doc: DocumentOwnership, requester: Partial<Requester>): boolean {
  return doc.doc_category !== 'knowledge' && isOwnedBy(doc, requester);
}
