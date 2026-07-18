import { beforeEach, describe, expect, it } from "vitest";
import { fillField, rollbackFilled, type RollbackEntry } from "./filler";
import type { DetectedField, FieldMapping } from "../shared/types";

const FIELD_ID_ATTR = "data-eli-apply-mate-field-id";

function mapping(partial: Partial<FieldMapping>): FieldMapping {
  return {
    fieldId: "f-1",
    kind: "firstName",
    confidence: "high",
    reason: "test",
    ...partial
  };
}

function detected(partial: Partial<DetectedField>): DetectedField {
  return {
    id: "f-1",
    elementType: "input",
    labelText: "",
    ...partial
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("fillField", () => {
  it("fills a text input, dispatches events, and records rollback", () => {
    document.body.innerHTML = `<input ${FIELD_ID_ATTR}="f-1" value="old" />`;
    const input = document.querySelector("input")!;
    const events: string[] = [];
    input.addEventListener("input", () => events.push("input"));
    input.addEventListener("change", () => events.push("change"));

    const rollback: RollbackEntry[] = [];
    const ok = fillField(mapping({ value: "Alex" }), detected({}), rollback);

    expect(ok).toBe(true);
    expect(input.value).toBe("Alex");
    expect(events).toEqual(["input", "change"]);
    expect(rollback).toHaveLength(1);
    expect(rollback[0].value).toBe("old");
  });

  it("does not record rollback when a select has no matching option", () => {
    document.body.innerHTML = `
      <select ${FIELD_ID_ATTR}="f-1">
        <option value="">Select one</option>
        <option>Maybe</option>
      </select>`;
    const select = document.querySelector("select")!;
    let changed = 0;
    select.addEventListener("change", () => changed++);

    const rollback: RollbackEntry[] = [];
    const ok = fillField(mapping({ value: "Yes" }), detected({ elementType: "select" }), rollback);

    expect(ok).toBe(false);
    expect(rollback).toHaveLength(0);
    expect(changed).toBe(0);
    expect(select.value).toBe("");
  });

  it("fills a select when an option matches by text", () => {
    document.body.innerHTML = `
      <select ${FIELD_ID_ATTR}="f-1">
        <option value="">Select one</option>
        <option>Yes</option>
        <option>No</option>
      </select>`;
    const select = document.querySelector("select")!;

    const rollback: RollbackEntry[] = [];
    const ok = fillField(mapping({ value: "No" }), detected({ elementType: "select" }), rollback);

    expect(ok).toBe(true);
    expect(select.value).toBe("No");
    expect(rollback).toHaveLength(1);
  });

  it("checks the radio whose label matches the value", () => {
    document.body.innerHTML = `
      <label><input type="radio" name="auth" value="1" ${FIELD_ID_ATTR}="f-1" /> Yes</label>
      <label><input type="radio" name="auth" value="2" ${FIELD_ID_ATTR}="f-1" /> No</label>`;
    const radios = Array.from(document.querySelectorAll<HTMLInputElement>("input"));

    const rollback: RollbackEntry[] = [];
    const ok = fillField(mapping({ value: "Yes" }), detected({ elementType: "radio" }), rollback);

    expect(ok).toBe(true);
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
  });

  it("refuses to touch file inputs", () => {
    document.body.innerHTML = `<input type="file" ${FIELD_ID_ATTR}="f-1" />`;
    const rollback: RollbackEntry[] = [];
    const ok = fillField(mapping({ value: "resume.pdf" }), detected({ inputType: "file" }), rollback);
    expect(ok).toBe(false);
    expect(rollback).toHaveLength(0);
  });
});

describe("rollbackFilled", () => {
  it("restores original values and empties the entry list", () => {
    document.body.innerHTML = `
      <input ${FIELD_ID_ATTR}="f-1" value="original" />
      <select ${FIELD_ID_ATTR}="f-2">
        <option value="">Select one</option>
        <option>Yes</option>
      </select>`;
    const input = document.querySelector("input")!;
    const select = document.querySelector("select")!;

    const rollback: RollbackEntry[] = [];
    fillField(mapping({ fieldId: "f-1", value: "changed" }), detected({ id: "f-1" }), rollback);
    fillField(mapping({ fieldId: "f-2", value: "Yes" }), detected({ id: "f-2", elementType: "select" }), rollback);

    expect(input.value).toBe("changed");
    expect(select.value).toBe("Yes");

    const count = rollbackFilled(rollback);
    expect(count).toBe(2);
    expect(input.value).toBe("original");
    expect(select.value).toBe("");
    expect(rollback).toHaveLength(0);
  });

  it("restores radio checked state", () => {
    document.body.innerHTML = `
      <label><input type="radio" name="auth" checked value="1" ${FIELD_ID_ATTR}="f-1" /> No</label>
      <label><input type="radio" name="auth" value="2" ${FIELD_ID_ATTR}="f-1" /> Yes</label>`;
    const radios = Array.from(document.querySelectorAll<HTMLInputElement>("input"));

    const rollback: RollbackEntry[] = [];
    fillField(mapping({ value: "Yes" }), detected({ elementType: "radio" }), rollback);
    expect(radios[1].checked).toBe(true);

    rollbackFilled(rollback);
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);
  });
});
