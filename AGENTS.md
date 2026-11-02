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

- Password recovery uses the public `/reset-password` route and requires a recovery signal plus a server-validated Auth user before changing a password; ordinary signed-in sessions must not enable the recovery form.
- Use the shared PasswordInput control for password visibility so sign-in and recovery fields have consistent accessible toggles.
