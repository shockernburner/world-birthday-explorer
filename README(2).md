# World Birthday Explorer

A child-friendly, static, installable PWA for learning national days, independence days, foundation days and short country histories.

## Publish on GitHub Pages
1. Create a new GitHub repository.
2. Upload every file and folder in this project to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.

The site uses Leaflet from a CDN. Core app files and country lessons are cached for offline use after the first visit. Flags are loaded from FlagCDN and cached as they are viewed.

## Data note
“Birthday” is a child-friendly term. The represented date may be a national day, independence day, republic day, constitution day, statehood day or foundation day. Some countries have several equally important national dates. Review and edit `data/countries.json` when required.

## Local testing
Service workers require HTTP rather than opening the file directly:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.
