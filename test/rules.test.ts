import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedProfile, personId } from "../src/lib/rules.ts";

const af = { email: "someone@avantifellows.org", email_verified: true, hd: "avantifellows.org" };

test("an AF Workspace account with a verified email signs in", () => {
  assert.equal(allowedProfile(af), true);
  assert.equal(allowedProfile({ ...af, email: "Someone@AvantiFellows.org" }), true);
});

test("everyone else is refused", () => {
  assert.equal(allowedProfile(undefined), false);
  assert.equal(allowedProfile({ ...af, hd: undefined }), false, "personal account: no hd");
  assert.equal(allowedProfile({ ...af, hd: "gmail.com" }), false);
  assert.equal(allowedProfile({ ...af, email_verified: false }), false);
  assert.equal(allowedProfile({ ...af, email_verified: null }), false);
  assert.equal(allowedProfile({ ...af, email: "x@gmail.com" }), false, "hd and email must agree");
  assert.equal(allowedProfile({ ...af, email: "x@avantifellows.org.evil.com" }), false);
  assert.equal(allowedProfile({ ...af, email: "x@notavantifellows.org" }), false);
  assert.equal(allowedProfile({ ...af, email: null }), false);
});

test("a person is kind:value, lower-cased", () => {
  assert.equal(personId("email", " A@AvantiFellows.org "), "email:a@avantifellows.org");
});
