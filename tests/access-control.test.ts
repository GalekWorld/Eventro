import assert from "node:assert/strict";
import {
  canAccessAdminArea,
  canAccessEventChatPolicy,
  canAccessOwnedVenueResource,
  canAccessScannerEventPolicy,
  canAccessVenueArea,
} from "../src/lib/access-control.ts";

export function runAccessControlTests() {
  assert.equal(canAccessAdminArea("ADMIN"), true);
  assert.equal(canAccessAdminArea("VENUE"), false);
  assert.equal(canAccessAdminArea("USER"), false);

  assert.equal(canAccessVenueArea("VENUE"), true);
  assert.equal(canAccessVenueArea("ADMIN"), false);
  assert.equal(canAccessVenueArea("USER"), false);

  assert.equal(canAccessOwnedVenueResource({ role: "VENUE", isOwner: true }), true);
  assert.equal(canAccessOwnedVenueResource({ role: "VENUE", isOwner: false }), false);
  assert.equal(canAccessOwnedVenueResource({ role: "ADMIN", isOwner: true }), false);

  assert.equal(
    canAccessEventChatPolicy({
      role: "ADMIN",
      isOwner: false,
      hasConfirmedEventAccess: false,
    }),
    true,
  );
  assert.equal(
    canAccessEventChatPolicy({
      role: "VENUE",
      isOwner: true,
      hasConfirmedEventAccess: false,
    }),
    true,
  );
  assert.equal(
    canAccessEventChatPolicy({
      role: "USER",
      isOwner: false,
      hasConfirmedEventAccess: true,
    }),
    true,
  );
  assert.equal(
    canAccessEventChatPolicy({
      role: "USER",
      isOwner: false,
      hasConfirmedEventAccess: false,
    }),
    false,
  );

  assert.equal(
    canAccessScannerEventPolicy({
      role: "ADMIN",
      hasAssignment: false,
    }),
    true,
  );
  assert.equal(
    canAccessScannerEventPolicy({
      role: "USER",
      hasAssignment: true,
    }),
    true,
  );
  assert.equal(
    canAccessScannerEventPolicy({
      role: "USER",
      hasAssignment: false,
    }),
    false,
  );
}
