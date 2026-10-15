# Satish Gallery: backend + admin panel

Node.js + Express + MongoDB + Cloudinary. Visitors order through the artist's WhatsApp. The artist manages paintings from an admin panel.

## 1. One-time setup

**MongoDB (free):** create a cluster on mongodb.com/atlas > Connect > Drivers > copy the connection string
(replace `<password>`, and add `/satish-gallery` before the `?`). In Atlas > Network Access, allow your IP.

**Cloudinary (free):** sign up at cloudinary.com > Settings > API Keys > copy Cloud name, API Key, API Secret.

## 2. Run it

```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env   then fill in every value
npm run create-admin     # creates your admin login from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

- Admin panel: http://localhost:3000/admin/
- Test gallery page: http://localhost:3000/gallery-demo.html

Set `WHATSAPP_NUMBER` in `.env` as country code + number, digits only (India example: `919876543210`).

## 3. Connect YOUR frontend

1. Copy your HTML/CSS/JS/images into the `public/` folder (keep `public/js/sg-gallery.js` and `public/css/gallery.css`).
2. Where the gallery should appear (and for "Popular Paintings" on the home page), add:

```html
<link rel="stylesheet" href="css/gallery.css">
...
<div id="sg-gallery"></div>                         <!-- all paintings -->
<div id="sg-gallery" data-featured="1" data-limit="5"></div>   <!-- Popular Paintings only -->
...
<script src="js/sg-gallery.js" defer></script>
```

3. Every "Enquire Now" / "Buy" button that should open WhatsApp: add `data-whatsapp`

```html
<a data-whatsapp href="#">Enquire Now</a>
```

(Painting cards get their own "Order on WhatsApp" button with the painting's name, size and price already typed into the message.)

4. If you open your frontend with VS Code Live Server instead of through `localhost:3000`, add the server address to the script tag, and allow Live Server in `.env`:

```html
<script src="js/sg-gallery.js" data-api="http://localhost:3000" defer></script>
```
```
CORS_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
```

To style the cards like your design, edit `public/css/gallery.css` (colours are variables at the top) or rename the classes (`.sg-card`, `.sg-title`, ...) in `sg-gallery.js` to your own.

### Gallery filters

The default gallery shows a filter bar: **Search**, **All mediums**, **All styles** and a **sort order** dropdown.
- Mediums come from the *Medium* field of your paintings (the admin form suggests Oil on Canvas, Acrylic on Canvas, etc.). Only mediums that exist appear.
- Styles are your categories (Nature, Landscape ...).
- Sort: Newest first, Oldest first, Price low to high / high to low, Title A to Z.
- API: `/api/paintings?search=&medium=&category=&sort=` and `/api/mediums`.

## 4. Using the admin panel

- **Add painting:** title, price, size/ratio, medium, description, up to 6 images (first = cover). Tick "featured" to show it under Popular Paintings.
- **Sold / Available:** change it in the table. Sold paintings show a "Sold" tag and no WhatsApp button.
- **Delete:** removes the painting and its images from Cloudinary.

## Categories (Nature, Portraits, Abstract ...)

**In the admin panel**
1. Click **Manage categories**, type a name (for example `Nature`) and click **Add**. You can rename or delete categories there too. Deleting a category never deletes its paintings; they just become "No category".
2. When you add or edit a painting, pick its category from the **Category** dropdown.
3. Use the filter next to the search box to see only one category's paintings.

**On your gallery page** (the `<div id="sg-gallery">` from step 3 of "Connect YOUR frontend")
- `<div id="sg-gallery"></div>` shows filter buttons: All, Nature, Portraits ... Clicking one shows only that category.
- `<div id="sg-gallery" data-group="1"></div>` shows one section per category, one below the other, with the category name as a heading.
- `<div id="sg-gallery" data-featured="1" data-limit="5"></div>` is for "Popular Paintings" on the home page and has no category buttons.
- To open the gallery page already on one category (for example from a link on your home page), link to `gallery.html#nature`. The part after `#` is the category's lowercase name.

Only categories that have at least one painting appear as buttons on the website.

## 5. Going live

Deploy to Render, Railway or a VPS, set the same variables from `.env` there, set `NODE_ENV=production`, and use HTTPS.
