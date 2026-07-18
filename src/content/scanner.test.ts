import { beforeEach, describe, expect, it } from "vitest";
import { findFieldElements, scanPage } from "./scanner";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("scanPage", () => {
  it("detects labeled inputs with names and placeholders", () => {
    document.body.innerHTML = `
      <label>First name <input name="first_name" placeholder="Given name" required /></label>`;
    const fields = scanPage();
    expect(fields).toHaveLength(1);
    expect(fields[0].labelText).toContain("First name");
    expect(fields[0].name).toBe("first_name");
    expect(fields[0].placeholder).toBe("Given name");
    expect(fields[0].required).toBe(true);
  });

  it("groups radios sharing a name into one field with option labels", () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Authorized to work?</legend>
        <label><input type="radio" name="auth" value="yes" /> Yes</label>
        <label><input type="radio" name="auth" value="no" /> No</label>
      </fieldset>`;
    const fields = scanPage();
    expect(fields).toHaveLength(1);
    expect(fields[0].elementType).toBe("radio");
    expect(fields[0].options).toHaveLength(2);
    expect(findFieldElements(fields[0].id)).toHaveLength(2);
  });

  it("keeps unnamed radio groups in separate containers apart", () => {
    document.body.innerHTML = `
      <div><div>
        <label><input type="radio" value="yes" /> Yes</label>
        <label><input type="radio" value="no" /> No</label>
      </div></div>
      <div><div>
        <label><input type="radio" value="remote" /> Remote</label>
        <label><input type="radio" value="onsite" /> Onsite</label>
      </div></div>`;
    const fields = scanPage().filter((field) => field.elementType === "radio");
    expect(fields).toHaveLength(2);
    expect(fields[0].options).toHaveLength(2);
    expect(fields[1].options).toHaveLength(2);
  });

  it("skips hidden inputs", () => {
    document.body.innerHTML = `
      <input type="hidden" name="csrf" />
      <input name="visible_one" />
      <input name="styled_away" style="display: none" />`;
    const fields = scanPage();
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe("visible_one");
  });

  it("captures select options", () => {
    document.body.innerHTML = `
      <label>Gender
        <select name="gender">
          <option value="">Select one</option>
          <option>Man</option>
          <option>Woman</option>
        </select>
      </label>`;
    const fields = scanPage();
    expect(fields[0].elementType).toBe("select");
    expect(fields[0].options).toEqual(["Select one", "Man", "Woman"]);
  });
});
