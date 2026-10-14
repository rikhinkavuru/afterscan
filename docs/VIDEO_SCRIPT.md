# Demo video script (≤ 3 min)

Target 2:40. Screen recording of the live site, voiceover. No slides except the opening card.

**0:00–0:20 Hook (title card, then face or voice)**
"You get a CT scan for a kidney stone. The report says: seven millimetre nodule in the right lung, follow-up recommended. The urologist treats the stone. Nobody calls about the nodule. In one study, four in ten of these recommended follow-ups never happened. Some of those were early lung cancers."

**0:20–0:35 The moment (screen: patient portal mock or the landing page)**
"Since 2021 you see that report the second it's signed, usually before your doctor does. That's the moment Afterscan is built for."

**0:35–1:25 Live demo, hero case**
- Click the kidney-stone sample. Fill age 52, former smoker, scan date. Click Read my report.
- While it loads: "The report goes to a model once. It has to quote the exact sentence for every finding, and the server checks each quote against the text."
- Results appear. Point at the highlighted quotes in the report. "Two findings. The simple kidney cyst: benign, nothing to do, and it says so. The lung nodule: the Fleischner guideline says CT at six to twelve months, then again at eighteen to twenty-four."
- Toggle low-risk / high-risk. "The schedule depends on a risk category your doctor decides, so it shows both and gives you the question to ask."
- Open "What the guideline says and why this rule fired." "Every rule is code with a test, and it tells you which one fired. The AI never writes the plan."
- Click Add to calendar. Show the .ics opening with the two events and the two-week-before reminders. Click Track in this browser, open My follow-ups.

**1:25–1:55 It knows when to say no (fast cuts)**
- Normal chest X-ray: "Nothing to follow up."
- Lung-cancer screening scan: "Out of scope: that's Lung-RADS, ask about your category."
- Calcified granuloma: "Benign, no plan."
- Paste a recipe: "Not a radiology report."

**1:55–2:20 Breadth and rigour (screen: methods page, then eval table)**
"Six organ systems: lung, adrenal, kidney, liver, pancreas, thyroid, transcribed from the primary guideline papers. Sixty-nine engine tests. We evaluated on a hundred and twenty-three synthetic reports with known answers, the same reports rewritten in four radiologist styles, and seventy real chest X-ray reports from NIH." Read the headline numbers from docs/EVAL.md.

**2:20–2:40 Close**
"Afterscan doesn't diagnose and doesn't replace your doctor. It gives you the date and the question, so the follow-up that was recommended actually happens. Nothing is stored. Try it at afterscan.vercel.app."
