@AGENTS.md

# UI & Layout Guidelines for Dashboard
When creating or modifying components and pages within the dashboard project, you MUST strictly adhere to the following rules:

1. **Colors and Spacing:**
   - ONLY use colors defined in `constants/colors.ts` (`COLORS`). Do not use any hardcoded hex/rgb color values.
   - ONLY use spacing defined in `constants/spacing.ts` (`SPACING`). Do not use any hardcoded number/pixel values for padding, margin, or gaps.

2. **Layouts:**
   - Always use the `HStack` and `VStack` components from `components/general` to structure and set up layouts. 
   - Avoid writing custom `display: flex` using native HTML tags unless absolutely necessary.

3. **Typography:**
   - Always use the `Typo` component (`Typo.XXS`, `Typo.SM`, `Typo.MD`, etc.) from `components/general/Typo` for writing text.
   - Do not use native HTML text tags (e.g., `<p>`, `<span>`, `<div>` for text) directly for typography.
