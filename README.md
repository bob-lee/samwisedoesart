# samwisedoesart

Sam's website, https://samwisedoesart.web.app
package manager: `yarn`

## 26Apr20

- install dependencies on root and functions folders (react-joanne project referred)
- how to merge functions taken from joanne-lee (handling images) and /index.js of react-joanne (ssr)
- setup babel to compile src folder and /index.js

```bash
# firebase.json, "functions" has lint that complaints a lot on babel compiled code
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint"
    ],
```

