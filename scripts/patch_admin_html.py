import os

index_path = os.path.join(os.path.dirname(__file__), "..", "admin", "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update script auth check
old_script = """    const savedTheme = localStorage.getItem("theme") || "light";
    const isAuthenticated = sessionStorage.getItem("samarth_admin_auth") === "true";
    document.documentElement.classList.add(savedTheme);
    document.documentElement.classList.toggle("is-authenticated", isAuthenticated);"""

new_script = """    const savedTheme = localStorage.getItem("theme") || "light";
    let isAuthenticated = false;
    try {
      const session = JSON.parse(localStorage.getItem("samarth_supabase_auth_session") || "null");
      isAuthenticated = !!(session && session.access_token) || (sessionStorage.getItem("samarth_admin_auth") === "true");
    } catch (e) {}
    document.documentElement.classList.add(savedTheme);
    document.documentElement.classList.toggle("is-authenticated", isAuthenticated);"""

# Update login email label and placeholder
old_user_field = """        <div class="form-group" style="text-align: left;">
          <label class="form-label" for="login-username">
            <span><i class="fas fa-user"></i> Username</span>
          </label>
          <input
            type="text"
            id="login-username"
            class="form-input"
            required
            autocomplete="username"
            spellcheck="false"
          />
        </div>"""

new_user_field = """        <div class="form-group" style="text-align: left;">
          <label class="form-label" for="login-username">
            <span><i class="fas fa-envelope"></i> Supabase Admin Email</span>
          </label>
          <input
            type="email"
            id="login-username"
            class="form-input"
            required
            autocomplete="email"
            placeholder="admin@example.com"
            spellcheck="false"
          />
        </div>"""

src_norm = content.replace("\r\n", "\n")
target_script = old_script.replace("\r\n", "\n")
repl_script = new_script.replace("\r\n", "\n")
target_user = old_user_field.replace("\r\n", "\n")
repl_user = new_user_field.replace("\r\n", "\n")

if target_script in src_norm:
    src_norm = src_norm.replace(target_script, repl_script, 1)
    print("[OK] Updated inline auth script")
else:
    print("[FAIL] inline auth script not matched")

if target_user in src_norm:
    src_norm = src_norm.replace(target_user, repl_user, 1)
    print("[OK] Updated login username to email field")
else:
    print("[FAIL] login username field not matched")

with open(index_path, "w", encoding="utf-8") as f:
    f.write(src_norm)

print("Saved admin/index.html")

