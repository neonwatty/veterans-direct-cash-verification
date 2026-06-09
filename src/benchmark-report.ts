import type { EvaluationResult } from "./types.js";

export interface BenchmarkMarkdownOptions {
  title: string;
  date: string;
  extractionDir: string;
  results: EvaluationResult[];
  commands: string[];
  notes: string[];
}

export function renderBenchmarkMarkdown(options: BenchmarkMarkdownOptions): string {
  const passed = options.results.filter((result) => result.passed).length;
  const failed = options.results.length - passed;
  const lines = [
    `# ${options.title}`,
    "",
    `Date: ${options.date}`,
    "",
    "## Summary",
    "",
    `- Extraction directory: \`${options.extractionDir}\``,
    `- Fixtures: ${options.results.length}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed}`,
    "",
    "## Commands",
    "",
    "```bash",
    ...options.commands,
    "```",
    "",
    "## Results",
    "",
    "| Fixture | Status | Failures |",
    "|---|---|---|"
  ];

  for (const result of options.results) {
    lines.push(
      `| \`${result.file}\` | ${result.passed ? "pass" : "fail"} | ${formatFailures(result.failures)} |`
    );
  }

  if (options.notes.length > 0) {
    lines.push("", "## Notes", "");
    for (const note of options.notes) {
      lines.push(`- ${note}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatFailures(failures: string[]): string {
  if (failures.length === 0) return "";
  return failures.map((failure) => failure.replaceAll("|", "\\|")).join("<br>");
}
