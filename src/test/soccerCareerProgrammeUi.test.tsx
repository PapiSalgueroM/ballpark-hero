import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import recorded from "../../scripts/data/careerLeagueWorldSaves1100.json";
import { FALLBACK_CLUBS } from "@/lib/soccerCareerEngine";
import type { CareerState } from "@/lib/soccerCareerEngine";
import { cancelProgramme, chooseProgramme, programmeOptions } from "@/lib/soccerCareerProgramme";
import SoccerCareerProgramme from "@/components/soccer-career/SoccerCareerProgramme";

type ProgrammeId = ReturnType<typeof programmeOptions>[number]["id"];
const cases: { id: ProgrammeId; choice: string }[] = [
  { id: "tactics", choice: "creator" }, { id: "position", choice: "CAM" },
  { id: "set_pieces", choice: "free_kicks" }, { id: "promise", choice: "starter" },
  { id: "negotiation", choice: "wage" }, { id: "bonuses", choice: "assists" },
  { id: "adaptation", choice: "integrate" }, { id: "fitness", choice: "managed" },
  { id: "captain", choice: "calm" }, { id: "loan", choice: "buy" },
];
function fixture(id?: ProgrammeId): CareerState {
  const captured = recorded.saves.find(row => row.id === "ere")!.state;
  const career = JSON.parse(JSON.stringify(captured)) as CareerState;
  career.phase = "playing"; career.retired = false; career.position = "CM";
  career.overall = 85; career.age = 26; career.morale = 70;
  const parent = FALLBACK_CLUBS.find(club => club.name === "Anderlecht")!;
  if (id === "negotiation") {
    career.phase = "transfer_window";
    career.transferSituation = { type: "one_offer", offer: { club: parent, contractYears: 3, wage: 15000, transferFee: 5 } };
  }
  if (id === "adaptation") {
    const index = career.seasons.map(row => row.type).lastIndexOf("playing");
    career.seasons[index] = { ...career.seasons[index], club: parent.name, clubCountry: parent.country };
  }
  if (id === "fitness") {
    const year = career.seasons[career.seasons.length - 1].year;
    career.seriousInjuries = [{ year, name: "Recorded knee injury", weeks: 24, path: "plan", setback: false }];
  }
  if (id === "captain") { career.isClubCaptain = true; career.captainClub = career.currentClub; }
  if (id === "loan") career.loan = { parentClub: parent.name, parentTier: parent.tier, parentLeague: parent.league, parentCountry: parent.country, parentColor: parent.color };
  return career;
}
function mount(career: CareerState) {
  const changed = vi.fn();
  function Harness() {
    const [current, setCurrent] = useState(career);
    const [open, setOpen] = useState(false);
    return <>
      <button type="button" onClick={() => setOpen(true)}>Open career plans</button>
      <button type="button">Other page control</button>
      {open && <SoccerCareerProgramme career={current} onChange={next => { changed(next); setCurrent(next); }} onClose={() => setOpen(false)} />}
    </>;
  }
  const rendered = render(<Harness />);
  return { ...rendered, changed };
}
async function press(element: HTMLElement) { await act(async () => { fireEvent.click(element); }); }
async function open() {
  const trigger = screen.getByRole("button", { name: "Open career plans" });
  trigger.focus(); await press(trigger);
  const dialog = await screen.findByRole("dialog");
  await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
  return { trigger, dialog };
}
async function plans() { await open(); await press(screen.getByRole("button", { name: "See my plans" })); }
async function detail(id: ProgrammeId) {
  const tile = document.querySelector<HTMLButtonElement>(`[data-programme-tile="${id}"]`)!;
  await press(tile);
  return document.querySelector<HTMLElement>(`[data-programme-detail="${id}"]`)!;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Soccer career programme UI", () => {
  it("shows rules and a worked example before any choices and can reopen them", async () => {
    const { changed } = mount(fixture());
    await open();
    expect(screen.getByRole("heading", { name: "Example" })).toBeInTheDocument();
    expect(document.querySelector("[data-programme-list]")).not.toBeInTheDocument();
    expect(screen.getByText(/Opening, reading or closing this screen does not change/)).toBeInTheDocument();
    await press(screen.getByRole("button", { name: "See my plans" }));
    expect(document.querySelectorAll("[data-programme-tile]")).toHaveLength(10);
    await press(screen.getByRole("button", { name: "Career programme help" }));
    expect(screen.getByRole("heading", { name: "Example" })).toBeInTheDocument();
    await press(screen.getByRole("button", { name: "Back" }));
    expect(document.querySelector("[data-programme-list]")).toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });

  it.each(cases)("dispatches the exact available $id choice and retains the complete helper state", async ({ id, choice }) => {
    const career = fixture(id), before = JSON.stringify(career);
    const view = programmeOptions(career).find(row => row.id === id)!;
    const option = view.choices.find(row => row.id === choice)!;
    expect(option?.eligible).toBe(true);
    const expected = chooseProgramme(career, id, choice);
    const { changed } = mount(career);
    await plans();
    const selected = await detail(id);
    const choose = selected.querySelector<HTMLButtonElement>(`[data-programme-choice="${choice}"]`)!;
    const optionCard = choose.closest<HTMLElement>("[data-programme-option]")!;
    expect(within(optionCard).getByText(option.effect)).toBeInTheDocument();
    expect(within(optionCard).getByText(option.tradeoff)).toBeInTheDocument();
    await press(choose);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toEqual(expected);
    expect(JSON.stringify(career)).toBe(before);
    const updated = programmeOptions(expected).find(row => row.id === id)!;
    expect(document.querySelector("[data-programme-current]")).toHaveTextContent(updated.choices.find(row => row.id === updated.choice)?.label ?? "No choice recorded");
    expect(document.querySelector("[data-programme-outcome]")).toHaveTextContent(updated.outcome ?? "No outcome recorded yet");
  });

  it.each(cases)("keeps the $id unavailable context disabled without applying a choice", async ({ id }) => {
    const career = fixture();
    if (id === "tactics" || id === "promise" || id === "bonuses") career.phase = "newspaper";
    if (id === "position" || id === "set_pieces") career.position = "GK";
    const view = programmeOptions(career).find(row => row.id === id)!;
    expect(view.choices.every(choice => !choice.eligible)).toBe(true);
    const held = JSON.stringify(career), { changed } = mount(career);
    await plans(); const selected = await detail(id);
    expect(selected.querySelector("[data-programme-context]")?.textContent?.length).toBeGreaterThan(0);
    for (const choice of view.choices) {
      const button = selected.querySelector<HTMLButtonElement>(`[data-programme-choice="${choice.id}"]`)!;
      expect(button).toBeDisabled(); await press(button);
      if (choice.reason) expect(within(button.parentElement!).getByText(choice.reason)).toBeInTheDocument();
    }
    expect(changed).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(held);
  });

  it("cancels only the selected queued plan and keeps another plan and unrelated state", async () => {
    const career = chooseProgramme(chooseProgramme(fixture(), "tactics", "creator"), "promise", "starter");
    const before = JSON.stringify(career), expected = cancelProgramme(career, "tactics");
    const { changed } = mount(career);
    await plans(); await detail("tactics");
    await press(screen.getByRole("button", { name: "Cancel plan" }));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed.mock.calls[0][0]).toEqual(expected);
    expect(programmeOptions(expected).find(row => row.id === "promise")?.choice).toBe("starter");
    expect(programmeOptions(expected).find(row => row.id === "tactics")?.choice).toBeNull();
    expect(expected.seasons).toEqual(career.seasons);
    expect(expected.weeklyWage).toBe(career.weeklyWage);
    expect(JSON.stringify(career)).toBe(before);
  });

  it("restores the list offset and the remounted selected tile after Back", async () => {
    mount(fixture()); await plans();
    const body = document.querySelector<HTMLDivElement>("[data-programme-body]")!;
    body.scrollTop = 137;
    await detail("tactics");
    body.scrollTop = 62;
    await press(screen.getByRole("button", { name: "Back to plans" }));
    expect(body.scrollTop).toBe(137);
    expect(document.querySelector('[data-programme-tile="tactics"]')).toHaveFocus();
  });

  it("restores the detail position and help trigger after reopened Help", async () => {
    mount(fixture()); await plans(); await detail("promise");
    const body = document.querySelector<HTMLDivElement>("[data-programme-body]")!;
    body.scrollTop = 91;
    await press(screen.getByRole("button", { name: "Career programme help" }));
    body.scrollTop = 20;
    await press(screen.getByRole("button", { name: "Back" }));
    expect(body.scrollTop).toBe(91);
    expect(document.querySelector("[data-programme-detail]")).toHaveAttribute("data-programme-detail", "promise");
    expect(screen.getByRole("button", { name: "Career programme help" })).toHaveFocus();
  });

  it.each(["Close", "Escape"] as const)("restores the original page focus and body lock after %s", async close => {
    const career = fixture(), before = JSON.stringify(career), overflow = document.body.style.overflow;
    const { changed } = mount(career), { trigger, dialog } = await open();
    expect(document.body).toHaveAttribute("data-scroll-locked");
    if (close === "Escape") await act(async () => { fireEvent.keyDown(dialog, { key: "Escape" }); });
    else await press(screen.getByRole("button", { name: "Close career programme" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe(overflow);
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
    expect(JSON.stringify(career)).toBe(before);
    expect(changed).not.toHaveBeenCalled();
  });

  it("reads an old save with no programme without random draws storage writes or injected defaults", async () => {
    const career = fixture(), before = JSON.stringify(career);
    const random = vi.spyOn(Math, "random"), storage = vi.spyOn(Storage.prototype, "setItem");
    const { changed } = mount(career);
    await plans(); await detail("tactics");
    expect(document.querySelector("[data-programme-current]")).toHaveTextContent("No choice recorded");
    expect(document.querySelector("[data-programme-outcome]")).toHaveTextContent("No outcome recorded yet");
    await press(screen.getByRole("button", { name: "Back to plans" }));
    expect(JSON.stringify(career)).toBe(before);
    expect(random).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled();
  });

  it("keeps retired choices unavailable without applying a future plan", async () => {
    const career = fixture(); career.retired = true; career.phase = "retired";
    const { changed } = mount(career);
    await plans(); const selected = await detail("tactics");
    for (const button of selected.querySelectorAll("[data-programme-choice]")) expect(button).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Cancel plan" })).not.toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });

  it("labels a recorded outcome with its saved club and year without borrowing the current context", async () => {
    const career = fixture();
    career.programme = { version: 1, receipts: [{ year: 2026, club: "Anderlecht", choices: { tactics: "creator" }, status: "completed", outcomes: { tactics: "Recorded creator role." }, bonusEuros: 0, penaltyGoals: 0, freeKickGoals: 0, secondaryPosition: null, promise: null }] };
    const before = JSON.stringify(career), { changed } = mount(career);
    await plans(); await detail("tactics");
    expect(document.querySelector("[data-programme-outcome]")).toHaveTextContent("Recorded outcome: 2026 at Anderlecht: Recorded creator role.");
    expect(document.querySelector("[data-programme-current]")).toHaveTextContent("Current choice: No choice recorded");
    expect(document.querySelector("[data-programme-context]")).toHaveTextContent(career.currentClub);
    expect(JSON.stringify(career)).toBe(before); expect(changed).not.toHaveBeenCalled();
  });

  it("explains why a keeper has no compatible second position instead of leaving an empty choice unexplained", async () => {
    const career = fixture(); career.position = "GK";
    const before = JSON.stringify(career), { changed } = mount(career);
    await plans(); const selected = await detail("position");
    expect(selected.querySelector("[data-programme-context]")).toHaveTextContent("No compatible second position is available for this position.");
    expect(selected.querySelectorAll("[data-programme-choice]")).toHaveLength(0);
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });

  it("shows the actual offered club and permits its counteroffer after a different club was negotiated", async () => {
    const career = fixture("negotiation"), year = career.seasons[career.seasons.length - 1].year + 1;
    career.programme = { version: 1, receipts: [], negotiated: [{ year, club: career.currentClub, mode: "wage", accepted: true }] };
    const before = JSON.stringify(career), expected = chooseProgramme(career, "negotiation", "wage"), { changed } = mount(career);
    await plans(); const selected = await detail("negotiation");
    expect(selected.querySelector("[data-programme-context]")).toHaveTextContent(`${year} at Anderlecht.`);
    expect(selected.querySelector("[data-programme-current]")).toHaveTextContent("Current choice: No choice recorded");
    const choose = selected.querySelector<HTMLButtonElement>('[data-programme-choice="wage"]')!;
    expect(choose).toBeEnabled(); await press(choose);
    expect(changed).toHaveBeenCalledTimes(1); expect(changed.mock.calls[0][0]).toEqual(expected);
    expect(JSON.stringify(career)).toBe(before);
  });

  it("shows a rejected wage proposal honestly and keeps the complete original offer", async () => {
    const career = fixture("negotiation"); career.overall = 70;
    const last = career.seasons.map(row => row.type).lastIndexOf("playing");
    career.seasons[last] = { ...career.seasons[last], rating: 7.0 };
    const before = JSON.stringify(career), expected = chooseProgramme(career, "negotiation", "wage"), { changed } = mount(career);
    await plans(); const selected = await detail("negotiation");
    await press(selected.querySelector<HTMLButtonElement>('[data-programme-choice="wage"]')!);
    expect(changed).toHaveBeenCalledTimes(1); expect(changed.mock.calls[0][0]).toEqual(expected);
    expect(changed.mock.calls[0][0].transferSituation).toEqual(career.transferSituation);
    expect(changed.mock.calls[0][0].weeklyWage).toBe(career.weeklyWage);
    expect(document.querySelector("[data-programme-outcome]")).toHaveTextContent("Wage counteroffer rejected by the simulation rule. The original offer is unchanged.");
    for (const button of selected.querySelectorAll("[data-programme-choice]")) expect(button).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Cancel plan" })).not.toBeInTheDocument();
    await press(screen.getByRole("button", { name: "Back to plans" }));
    expect(document.querySelector('[data-programme-tile="negotiation"]')).toHaveTextContent("Choice recorded");
    expect(JSON.stringify(career)).toBe(before);
  });
  it("restores the list position and help trigger after reopening rules from the list", async () => {
    const career = fixture(), before = JSON.stringify(career), { changed } = mount(career);
    await plans();
    const body = document.querySelector<HTMLDivElement>("[data-programme-body]")!;
    body.scrollTop = 84;
    await press(screen.getByRole("button", { name: "Career programme help" }));
    body.scrollTop = 29;
    await press(screen.getByRole("button", { name: "Back to my plans" }));
    expect(body.scrollTop).toBe(84);
    expect(document.querySelector("[data-programme-list]")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Career programme help" })).toHaveFocus();
    expect(changed).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it("uses explicit 44 pixel controls and caps scrolling inside the shared dialog", async () => {
    mount(fixture()); await plans(); await detail("tactics");
    const dialog = screen.getByRole("dialog");
    const controls = dialog.querySelectorAll<HTMLButtonElement>("[data-programme-back], [data-programme-help], [data-programme-close], [data-programme-choice]");
    expect(controls).toHaveLength(6);
    for (const button of controls) {
      expect(button.className).toContain("min-h-11"); expect(button.className).toContain("min-w-11");
    }
    expect(screen.getByRole("dialog").className).toContain("max-h-[88dvh]");
    expect(document.querySelector("[data-programme-body]")?.className).toContain("overflow-y-auto");
  });
});
