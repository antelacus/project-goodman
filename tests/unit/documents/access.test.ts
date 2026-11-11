import { isOwnedBy, isReadableBy, isSelectableBy, requesterOf } from '@/lib/documents/access';

const own = { doc_category: 'business', owner_type: 'guest', owner_id: 's-1' };
const library = { doc_category: 'knowledge', owner_type: 'system', owner_id: null };

describe('document access', () => {
  it('a guest owns by session, a user by account', () => {
    expect(requesterOf({ role: 'guest', sessionId: 's-1', userId: 'u-1' })).toEqual({ ownerType: 'guest', ownerId: 's-1' });
    expect(requesterOf({ role: 'user', sessionId: 's-1', userId: 'u-1' })).toEqual({ ownerType: 'user', ownerId: 'u-1' });
  });

  it('owns only the uploads stored under the same owner', () => {
    expect(isOwnedBy(own, { ownerType: 'guest', ownerId: 's-1' })).toBe(true);
    expect(isOwnedBy(own, { ownerType: 'guest', ownerId: 's-2' })).toBe(false);
    expect(isOwnedBy(own, { ownerType: 'user', ownerId: 's-1' })).toBe(false);
    expect(isOwnedBy({ ...own, owner_id: null }, { ownerType: 'guest', ownerId: undefined })).toBe(false);
  });

  it('reads library documents and own uploads; an admin reads everything', () => {
    expect(isReadableBy(library, { ownerType: 'guest', ownerId: 's-9' })).toBe(true);
    expect(isReadableBy(own, { ownerType: 'guest', ownerId: 's-1' })).toBe(true);
    expect(isReadableBy(own, { ownerType: 'guest', ownerId: 's-9' })).toBe(false);
    expect(isReadableBy(own, { ownerType: 'admin', ownerId: 'u-0' })).toBe(true);
  });

  it('selects only own uploads for numbering, never a library document, even one the admin uploaded', () => {
    expect(isSelectableBy(own, { ownerType: 'guest', ownerId: 's-1' })).toBe(true);
    const adminsLibraryUpload = { doc_category: 'knowledge', owner_type: 'admin', owner_id: 'u-0' };
    expect(isOwnedBy(adminsLibraryUpload, { ownerType: 'admin', ownerId: 'u-0' })).toBe(true);
    expect(isSelectableBy(adminsLibraryUpload, { ownerType: 'admin', ownerId: 'u-0' })).toBe(false);
  });
});
