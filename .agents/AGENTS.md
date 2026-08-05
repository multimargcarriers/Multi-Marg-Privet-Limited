# Design Guidelines

- **Modals and Popups**: Always render modals and popups using React Portals to ensure they are fixed to the viewport center. Use responsive grids (e.g. auto-fit) so their content fits dynamically within the screen without requiring vertical scrolling to find or interact with the popup.
