/*
   Copyright 2020 AryToNeX

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
"use strict";

const ipc = require("electron").ipcRenderer;

// App constants
let currentState;
const sectionInitial = document.querySelector("#initial");
const sectionDownloading = document.querySelector("#downloading");
const sectionErrored = document.querySelector("#errored");
const sectionInstalling = document.querySelector("#installing");
const sectionInstalled = document.querySelector("#installed");
const sectionUninstalling = document.querySelector("#uninstalling");
const sectionUninstalled = document.querySelector("#uninstalled");
const sectionFailed = document.querySelector("#failed");
const sectionDnd = document.querySelector("#dnd");

const sexyWords = ["sexy", "beautiful", "awesome", "glassy", "orgasmic"];
const ApplicationStates = Object.freeze({
	READY: "READY",
	DOWNLOADING: "DOWNLOADING",
	ERRORED: "ERRORED",
	INSTALLING: "INSTALLING",
	INSTALLED: "INSTALLED",
	UNINSTALLING: "UNINSTALLING",
	UNINSTALLED: "UNINSTALLED",
	FAILED: "FAILED",
	DRAGGING: "DRAGGING"
});

// Rendering
function changeApplicationState (newState) {
	window.requestAnimationFrame(() => {
		if (newState === currentState || currentState === ApplicationStates.ERRORED) return;
		// Change section
		sectionInitial.style.display = newState === ApplicationStates.READY ? "block" : "none";
		sectionDownloading.style.display = newState === ApplicationStates.DOWNLOADING ? "block" : "none";
		sectionErrored.style.display = newState === ApplicationStates.ERRORED ? "block" : "none";
		sectionInstalling.style.display = newState === ApplicationStates.INSTALLING ? "block" : "none";
		sectionInstalled.style.display = newState === ApplicationStates.INSTALLED ? "block" : "none";
		sectionUninstalling.style.display = newState === ApplicationStates.UNINSTALLING ? "block" : "none";
		sectionUninstalled.style.display = newState === ApplicationStates.UNINSTALLED ? "block" : "none";
		sectionFailed.style.display = newState === ApplicationStates.FAILED ? "block" : "none";
		sectionDnd.style.display = newState === ApplicationStates.DRAGGING ? "block" : "none";

		// Update sexy word
		document.querySelectorAll(".sexy").forEach(e => (e.innerText = sexyWords[Math.floor(Math.random() * sexyWords.length)]));

		console.log(`Glasscordify > New state: ${newState}`);
		currentState = newState;
	});
}

// Bind all buttons
document.querySelector(".close").addEventListener("click", () => ipc.send("close"));
document.querySelector(".minimize").addEventListener("click", () => ipc.send("minimize"));
document.querySelectorAll("[data-install]").forEach(e => e.addEventListener("click", () => ipc.send("install-clicked")));
document.querySelectorAll("[data-uninstall]").forEach(e => e.addEventListener("click", () => ipc.send("uninstall-clicked")));
document.querySelector("#btn-restart").addEventListener("click", () => ipc.send("restart"));

// Drag and drop
let counter = 0;
document.body.ondragenter = () => {
	counter++;
	return false;
}
document.body.ondragleave = () => {
	if (--counter === 0) {
		changeApplicationState(ApplicationStates.READY);
	}
	return false;
};
document.body.ondragover = e => {
	if ([ ...e.dataTransfer.items ].some(f => f.kind === "file")) {
		changeApplicationState(ApplicationStates.DRAGGING);
	}
	return false;
};
document.body.ondrop = e => {
	e.preventDefault();
	if (currentState === ApplicationStates.DRAGGING) changeApplicationState(ApplicationStates.READY);
	return false;
};
document.querySelector("#drop-target-install").addEventListener("drop", e => {
	e.preventDefault();
	if (currentState === ApplicationStates.DRAGGING && e.dataTransfer.files.length !== 0) {
		ipc.send("install-drop", [ ...e.dataTransfer.files ].map(f => f.path));
	}
});
document.querySelector("#drop-target-uninstall").addEventListener("drop", e => {
		e.preventDefault();
	if (currentState === ApplicationStates.DRAGGING && e.dataTransfer.files.length !== 0) {
		ipc.send("uninstall-drop", [ ...e.dataTransfer.files ].map(f => f.path));
	}
});

// Modal
const modal = document.querySelector(".modal");
const openModal = function () {
	window.requestAnimationFrame(() => {
		document.body.classList.add("i-wish-backdrop-filter-would-work-and-not-require-me-to-blur-the-body");
		modal.setAttribute("aria-hidden", "false"); // Mark it as immediately visible
		modal.classList.remove("hidden");
		modal.classList.add("entering");
		setTimeout(() => window.requestAnimationFrame(() => {
			modal.classList.remove("entering");
		}), 300);
	});
}
const closeModal = function () {
	window.requestAnimationFrame(() => {
		document.body.classList.remove("i-wish-backdrop-filter-would-work-and-not-require-me-to-blur-the-body");
		modal.setAttribute("aria-hidden", "true"); // Mark it as immediately hidden
		modal.classList.add("leaving");
		setTimeout(() => window.requestAnimationFrame(() => {
			modal.classList.remove("leaving");
			modal.classList.add("hidden");
		}), 300);
	});
}

document.querySelector(".modal-inner").addEventListener("click", e => e.stopPropagation());
document.querySelector("#awesome").addEventListener("click", openModal);
document.querySelector("#modal-close").addEventListener("click", closeModal);
document.querySelector(".modal").addEventListener("click", closeModal);

// IPC events
ipc.on("asar-download", () => changeApplicationState(ApplicationStates.DOWNLOADING));
ipc.on("asar-success", () => changeApplicationState(ApplicationStates.READY));
ipc.on("asar-failure", () => changeApplicationState(ApplicationStates.ERRORED));

ipc.on("install-checking-app", () => changeApplicationState(ApplicationStates.FAILED));
ipc.on("install-success", () => {
	changeApplicationState(ApplicationStates.INSTALLED);
	setTimeout(() => changeApplicationState(ApplicationStates.READY), 10e3);
});
ipc.on("install-failed", () => changeApplicationState(ApplicationStates.FAILED));

ipc.on("uninstall-checking-app", () => changeApplicationState(ApplicationStates.FAILED));
ipc.on("uninstall-success", () => {
	changeApplicationState(ApplicationStates.UNINSTALLED);
	setTimeout(() => changeApplicationState(ApplicationStates.READY), 10e3);
});
ipc.on("uninstall-failed", () => changeApplicationState(ApplicationStates.FAILED));

const errorMessageElement = document.querySelector("#error-message");
ipc.on("explicit-error", (_, err) => {
	changeApplicationState(ApplicationStates.FAILED);
	errorMessageElement.innerText = err;
});

ipc.on("implicit-error", (_, err) => {
	changeApplicationState(ApplicationStates.FAILED);
	errorMessageElement.innerHTML = `An error popped out: <br/>${err}`;
});

// Trigger initial rendering
changeApplicationState(ApplicationStates.READY);
ipc.send("ready");
