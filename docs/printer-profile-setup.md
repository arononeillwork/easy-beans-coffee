# Square Printer Setup — Automatic Order Tickets

Goal: every **paid** website order prints a kitchen/order ticket automatically at the counter,
once, on the right printer. (Reference: Square ES help articles 5194, 8245, 8246, 8281.)

## 1. Connect the printer

Square POS → **≡ → Settings → Hardware → Printers** → connect the receipt/kitchen printer
(Ethernet/Bluetooth/USB per model) and run *Print test*.

## 2. Create the printer profile

Settings → Hardware → Printers → **Printer profiles** → create/edit the profile assigned to
that printer:

- **Order tickets** (tickets de pedido): **ON**
- **Online order tickets / kiosk orders** (pedidos online): **ON**
- **Automatically print new orders** (imprimir automáticamente): **ON**
- Receipts: leave for the front printer only — the customer's payment receipt for online
  orders is digital (Square email), the physical ticket is for preparation.

## 3. Category routing (optional, multi-printer)

If drinks and food print separately, assign Square item categories per profile:

- Coffee & drinks categories → Bar printer profile
- Food/bakery categories → Kitchen printer profile
- Full ticket → expo/collection printer if used

The seed/catalog categories (The Classics, Specialty, Smoothies, Bakery, Food, Cans,
Cold Drinks) are what you route on.

## 4. Avoid duplicate tickets

Only **one** POS device may have "online order tickets + auto-print" enabled per physical
printer. If two iPads share a profile, each prints every order (help article 8281). Pick the
counter device as the single print owner.

## 5. Verify (pilot, real device)

1. Place a sandbox → then a real low-value order from the website.
2. Confirm on the POS: order appears in **Orders/Pedidos** with customer name and pickup time.
3. Ticket prints automatically, **once**, on the intended printer, listing items, variation,
   modifiers, quantity and the customer note.
4. Mark the order *Ready* on POS → the customer's status page shows the ready message.
5. Complete the order at collection → status page shows *collected*.

Do not launch until this pilot passes end-to-end.
