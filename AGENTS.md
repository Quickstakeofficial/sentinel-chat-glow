<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep authentication and persistent conversation data in Lovable Cloud so access control and cross-device history remain authoritative.
- Store administrator roles separately from profiles and validate them server-side before every AI request to prevent client-side privilege escalation.
- Use AI Elements for the transcript and composer, with the Lovable AI Gateway as the only model boundary.
