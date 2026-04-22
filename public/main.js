import { connect } from "./connection.js";

const allPages = document.getElementsByClassName("page");
allPages.hideAll = () => Array.from(allPages).forEach(page => page.classList.add("hide"));

connect();