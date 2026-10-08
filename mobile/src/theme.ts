export const colors = {
  background: "#0B1120",
  card: "#141E30",
  raised: "#1C2940",
  border: "#2A3850",
  text: "#F4F7FD",
  muted: "#A6B3CB",
  blue: "#6696FF",
  primary: "#386EF5",
  green: "#62D6AB",
  amber: "#F7C66A",
  red: "#FF8896",
  cyan: "#7AD7EB",
};
export const fonts = {
  regular: "Jakarta_400Regular",
  medium: "Jakarta_500Medium",
  bold: "Jakarta_700Bold",
};
export const tone = (value: string) =>
  /Completed|Low|success/i.test(value)
    ? colors.green
    : /High|Overdue|failed/i.test(value)
      ? colors.red
      : /Progress|Medium|pending/i.test(value)
        ? colors.amber
        : colors.blue;
