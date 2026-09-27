import { beforeEach, describe, expect, it } from "vitest";
import { __memCustomersForTest, __memStudentsForTest, coerceStudent, getStudent, linkCustomerOnPayment, resolveStudent } from "./people";
import { designPeople, saveSchoolDesign, type RevisionInput } from "./store";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const rev = (name: string): RevisionInput => ({
  design: { designName: name },
  parts: null,
  proof: { name: "O", dataUrl: PNG },
  panels: [],
  artworkRights: null,
  variant: "flush",
  createdBy: "parent",
});
const owen = { displayName: "Owen", gradYear: 2028, activity: "hs:soccer", number: "12", relation: "parent" };

beforeEach(() => {
  __memStudentsForTest.clear();
  __memCustomersForTest.clear();
});

describe("coerceStudent — only the allowed facts, nothing else", () => {
  it("keeps name, class year, activity, number and relation; drops everything else", () => {
    const s = coerceStudent({ ...owen, gradYear: "2028", birthday: "2010-01-01", address: "1 Main St", phone: "555" });
    expect(s).toEqual(owen);
    expect(Object.keys(s!)).toEqual(["displayName", "gradYear", "activity", "number", "relation"]);
  });
  it("is null when the design says nothing about anyone", () => {
    expect(coerceStudent({ relation: "parent" })).toBeNull();
    expect(coerceStudent(null)).toBeNull();
  });
  it("refuses a nonsense class year", () => {
    expect(coerceStudent({ displayName: "Owen", gradYear: 3000 })!.gradYear).toBeNull();
  });
});

describe("the builder creates the student silently, and recognises them again", () => {
  it("a Send creates the student and hands the browser a ref to keep", async () => {
    const d = await saveSchoolDesign({ school: "ladue-rams", contact: null, revision: rev("a"), student: { input: owen, ref: null } });
    expect(d!.studentId).toBeTruthy();
    expect(d!.studentRef?.id).toBe(d!.studentId);
    expect((await getStudent(d!.studentId))).toMatchObject({ displayName: "Owen", gradYear: 2028, school: "ladue-rams" });
  });

  it("a second design from the same browser for Owen is the SAME student, updated", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: null, revision: rev("a"), student: { input: owen, ref: null } });
    const second = await saveSchoolDesign({
      school: "ladue-rams",
      contact: null,
      revision: rev("b"),
      student: { input: { ...owen, number: "7" }, ref: first!.studentRef },
    });
    expect(second!.studentId).toBe(first!.studentId);
    expect(second!.studentRef).toBeNull(); // nothing new for the browser to keep
    expect((await getStudent(first!.studentId))!.number).toBe("7");
  });

  it("a DIFFERENT name from the same browser is a new student (a second child)", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: null, revision: rev("a"), student: { input: owen, ref: null } });
    const lucy = await saveSchoolDesign({
      school: "ladue-rams",
      contact: null,
      revision: rev("c"),
      student: { input: { ...owen, displayName: "Lucy", gradYear: 2030 }, ref: first!.studentRef },
    });
    expect(lucy!.studentId).not.toBe(first!.studentId);
    expect((await getStudent(first!.studentId))!.displayName).toBe("Owen"); // untouched
  });

  it("a forged student ref never attaches to someone else's student", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: null, revision: rev("a"), student: { input: owen, ref: null } });
    const other = await resolveStudent({ input: owen, school: "ladue-rams", designStudentId: null, ref: { id: first!.studentId, token: "F".repeat(43) } });
    expect(other!.id).not.toBe(first!.studentId);
  });

  it("continuing a design keeps its student even from a device that has no ref", async () => {
    const first = await saveSchoolDesign({ school: "ladue-rams", contact: null, revision: rev("a"), student: { input: owen, ref: null } });
    const again = await saveSchoolDesign({
      link: { id: first!.id, token: first!.token },
      school: "ladue-rams",
      contact: null,
      revision: rev("a2"),
      student: { input: owen, ref: null },
    });
    expect(again!.studentId).toBe(first!.studentId);
  });
});

describe("a parent is linked only on proof", () => {
  it("a typed Send email links NOTHING; a payment links the student to that customer", async () => {
    const d = await saveSchoolDesign({ school: "ladue-rams", contact: { email: "pat@example.org" }, revision: rev("a"), student: { input: owen, ref: null } });
    expect((await getStudent(d!.studentId))!.customerId).toBeNull();
    const people = await designPeople(d!.id);
    const customerId = await linkCustomerOnPayment({ email: "PAT@example.org", orderId: "o1", studentId: people!.studentId, optIn: false });
    expect((await getStudent(d!.studentId))!.customerId).toBe(customerId);
    expect([...__memCustomersForTest.values()][0]).toMatchObject({ email: "pat@example.org", marketingOptInAt: null });
  });

  it("the student stays with the FIRST customer who paid for it", async () => {
    const d = await saveSchoolDesign({ school: "ladue-rams", contact: null, revision: rev("a"), student: { input: owen, ref: null } });
    const a = await linkCustomerOnPayment({ email: "a@example.org", orderId: "o1", studentId: d!.studentId, optIn: false });
    await linkCustomerOnPayment({ email: "b@example.org", orderId: "o2", studentId: d!.studentId, optIn: false });
    expect((await getStudent(d!.studentId))!.customerId).toBe(a);
  });

  it("consent is recorded on the customer when given", async () => {
    await linkCustomerOnPayment({ email: "pat@example.org", orderId: "o1", studentId: null, optIn: true });
    expect([...__memCustomersForTest.values()][0].marketingOptInAt).not.toBeNull();
  });
});
