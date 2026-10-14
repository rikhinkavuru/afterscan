import Link from "next/link";
import { GUIDELINE_COVERAGE } from "@/lib/engine";

export const metadata = { title: "How Afterscan works" };

export default function MethodsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="display text-4xl font-medium">How it works</h1>
      <p className="mt-3 text-lg text-ink-2">Two parts: a careful reader and a rulebook. The reader is an AI model. The rulebook is code with tests, and it does all the deciding.</p>

      <h2 className="display mt-10 text-2xl font-medium">The problem</h2>
      <p className="mt-2 text-ink-2">
        CT and MRI scans ordered for one reason routinely turn up something unrelated: a lung nodule on a kidney-stone CT, an adrenal nodule on a
        chest CT. Radiologists describe these and often recommend follow-up. Then the loop breaks. The ordering doctor was treating the kidney
        stone; nobody owns the nodule. In a 2020 safety-net cohort, 39% of patients with a recommended nodule follow-up had no documented
        surveillance at all, and reviews put adherence as low as 40%. Since the 21st Century Cures Act (2021), patients read the report in their
        portal immediately, usually before anyone explains it.
      </p>

      <h2 className="display mt-10 text-2xl font-medium">Step 1: read</h2>
      <p className="mt-2 text-ink-2">
        The report goes to a language model once, with a strict schema. It must return each finding with an exact quote from the report. The server
        then checks that every quote really appears in the text; a finding whose quote cannot be found is marked and down-weighted. The model
        also lists what it saw and deliberately ignored (negated sentences, non-focal findings) so you can audit it.
      </p>

      <h2 className="display mt-10 text-2xl font-medium">Step 2: apply the rulebook</h2>
      <p className="mt-2 text-ink-2">
        Nothing about the plan comes from the language model. Each finding goes through a deterministic engine that encodes the published
        guideline for that organ. Every branch is a unit test, and each card shows the rule that fired.
      </p>
      <ul className="mt-3 space-y-1 text-sm text-ink-2">
        {Object.entries(GUIDELINE_COVERAGE).map(([organ, g]) => (
          <li key={organ}>
            <span className="font-semibold capitalize">{organ}:</span> {g}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-ink-2">
        The engine refuses to answer when a guideline does not apply (lung cancer screening scans, known cancer, age under 35 for lung nodules,
        weakened immune system) and asks for what is missing when the report lacks a size or a feature the rule needs.
      </p>

      <h2 className="display mt-10 text-2xl font-medium">Step 3: make it stick</h2>
      <p className="mt-2 text-ink-2">
        Windows become dates from the scan date. You can export them as a calendar file with reminders, print them, or keep a checklist in your
        browser. Nothing is stored on a server.
      </p>

      <h2 className="display mt-10 text-2xl font-medium">What it is not</h2>
      <p className="mt-2 text-ink-2">
        It is not a diagnosis and not a substitute for your doctor, who knows things the report does not. Guidelines are written for clinicians
        and allow judgment; the right answer for you may differ. The product is the question list and the date, so the conversation happens.
      </p>

      <p className="mt-10 text-sm text-ink-3">
        Evaluation results, limitations, and the full rule tables are in the <a className="underline" href="https://github.com/rikhinkavuru/afterscan#evaluation">README</a>.{" "}
        <Link href="/" className="underline">Back to the reader</Link>.
      </p>
    </main>
  );
}
