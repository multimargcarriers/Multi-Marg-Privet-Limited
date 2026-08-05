# Design Guidelines

- **Modals and Popups**: Always render modals and popups using React Portals to ensure they are fixed to the viewport center. Use responsive grids (e.g. auto-fit) so their content fits dynamically within the screen without requiring vertical scrolling to find or interact with the popup.

# Business Logic Guidelines

- **Payment and Outstanding Calculations**: When calculating total payments or outstanding balances for Clients and Vendors, ALWAYS consider both Cash In and Cash Out entries. 
  - For **Clients**: Cash In adds to total paid, Cash Out subtracts from total paid.
  - For **Vendors**: Cash Out adds to total paid, Cash In subtracts from total paid.
  This ensures that cashsheets and purchases (or client bills) are correctly related and balances are maintained properly.

- Date format should ALWAYS be DD-MM-YYYY globally across the app.

- All amounts should be displayed in Indian number format (e.g. XX,XX,XXX.XX) using toLocaleString('en-IN').
