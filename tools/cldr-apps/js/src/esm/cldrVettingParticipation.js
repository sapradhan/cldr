/*
 * cldrVettingParticipation: encapsulate Survey Tool Vetting Participation code.
 */
import * as cldrAccount from "./cldrAccount.js";
import * as cldrAjax from "./cldrAjax.js";
import * as cldrInfo from "./cldrInfo.js";
import * as cldrLoad from "./cldrLoad.js";
import * as cldrRetry from "./cldrRetry.js";
import * as cldrStatus from "./cldrStatus.js";
import * as cldrSurvey from "./cldrSurvey.js";
import * as cldrText from "./cldrText.js";
import * as XLSX from "xlsx";

let nf = null; // Intl.NumberFormat initialized later

/**
 * Fetch the Vetting Participation data from the server, and "load" it
 *
 * Called as special.load
 */
function load() {
  cldrInfo.showMessage(cldrText.get("vetting_participationGuidance"));

  const url = getAjaxUrl();
  const xhrArgs = {
    url: url,
    handleAs: "json",
    load: loadHandler,
    error: errorHandler,
  };
  cldrAjax.sendXhr(xhrArgs);
}

function loadHandler(json) {
  if (json.err) {
    cldrRetry.handleDisconnect(
      json.err,
      json,
      "",
      "Loading vetting participation data"
    );
    return;
  }
  const ourDiv = document.createElement("div");
  loadVettingParticipation(json, ourDiv);
  cldrSurvey.hideLoader();
  cldrLoad.flipToOtherDiv(ourDiv);
}

function errorHandler(err) {
  cldrRetry.handleDisconnect(err, json, "", "Loading forum participation data");
}

/**
 * Get the AJAX URL to use for loading the Vetting Participation page
 */
function getAjaxUrl() {
  const p = new URLSearchParams();
  p.append("what", "vetting_participation");
  p.append("s", cldrStatus.getSessionId());
  return cldrAjax.makeUrl(p);
}

function downloadVettingParticipation(opts) {
  const {
    missingLocalesForOrg,
    // languagesNotInCLDR,
    // hasAllLocales,
    localeToData,
    // totalCount,
    uidToUser,
  } = opts;

  const wb = XLSX.utils.book_new();

  var ws_name = (missingLocalesForOrg || "ALL").substring(0, 31);

  var ws_data = [
    [
      "Org",
      "Locale",
      "Code",
      "Level",
      "Votes",
      "CldrCovCount",
      "Vetter#",
      "Email",
      "Name",
      "LastSeen",
    ],
  ];

  for (const [id, user] of Object.entries(uidToUser)) {
    const row = [
      user.org,
      null, // localeName
      null, // locale
      user.userlevelName,
      0, // votes
      0, // CldrCovCount
      id,
      user.email,
      user.name,
      user.time,
    ];
    if (user.allLocales) {
      row[1] = "ALL";
      row[2] = "*";
      ws_data.push(row);
    } else if (!user.locales) {
      // no locales?!
      row[1] = "NONE";
      row[2] = "-";
      ws_data.push(row);
    } else {
      for (const locale of user.locales) {
        row[1] = cldrLoad.getLocaleName(locale);
        row[2] = locale;
        row[4] = localeToData[locale].participation[id] || 0;
        row[5] = localeToData[locale].cov_count || 0;
        ws_data.push([...row]); // clone the array because ws_data will retain a reference
      }
    }
  }

  var ws = XLSX.utils.aoa_to_sheet(ws_data);

  XLSX.utils.book_append_sheet(wb, ws, ws_name);
  XLSX.writeFile(
    wb,
    `survey_participation.${missingLocalesForOrg || "ALL"}.xlsx`
  );
}

/**
 * Populate the given div, given the json for Vetting Participation
 *
 * @param json
 * @param ourDiv
 */
function loadVettingParticipation(json, ourDiv) {
  nf = new Intl.NumberFormat();
  const { missingLocalesForOrg, languagesNotInCLDR, hasAllLocales } = json;

  // crunch the numbers
  const { localeToData, totalCount, uidToUser } = calculateData(json);

  ourDiv.id = "vettingParticipation";
  const div = $(ourDiv);

  // Front matter
  div.append($("<h3>Locales and Vetting Participation</h3>"));
  div.append(
    $("<p/>", {
      text: `Total votes: ${nf.format(totalCount || 0)}`,
    })
  );
  const downloadButton = document.createElement("button");
  downloadButton.appendChild(document.createTextNode("Download… (.xlsx)"));
  downloadButton.onclick = () =>
    downloadVettingParticipation({
      // for now, throw in all data here.
      missingLocalesForOrg,
      languagesNotInCLDR,
      hasAllLocales,
      localeToData,
      totalCount,
      uidToUser,
    });
  div.append(downloadButton);
  if (missingLocalesForOrg) {
    div.append(
      $("<i/>", {
        text: `“No Coverage” locales indicate that there are no regular vetters assigned in the “${missingLocalesForOrg}” organization.`,
      })
    );
    if (hasAllLocales) {
      div.append(
        $("<p/>", {
          text: " The organiation has an asterisk (*) entry, indicating that all locales are allowed. “No coverage” means there is no coverage for a locale which is explicitly listed in Locales.txt. ",
        })
      );
    }
    if (languagesNotInCLDR && languagesNotInCLDR.length > 0) {
      div.append(
        $("<h4/>", {
          text: "Locales not in CLDR",
        })
      );
      div.append(
        $("<i/>", {
          text: `These locales are specified by Locales.txt for ${missingLocalesForOrg}, but do not exist in CLDR yet:`,
        })
      );
      for (const loc of languagesNotInCLDR) {
        div.append(
          $("<tt/>", {
            class: "fallback_code missingLoc",
            // Note: can't use locmap to get a translation here, because locmap only
            // has extant CLDR locales, and by definition 'loc' is not in CLDR yet.
            text: `${loc}`, // raw code
          })
        );
      }
    }
  }

  // Chapter 1

  const locmap = cldrLoad.getTheLocaleMap();
  const localeList = div.append($('<div class="locList" ></div>'));
  // console.dir(localeToData);
  for (const loc of Object.keys(localeToData).sort()) {
    const e = localeToData[loc]; // consistency
    const li = $('<div class="locRow"></div>');
    localeList.append(li);
    const locLabel = $(`<div class='locId'></div>`);
    locLabel.append(
      $("<a></a>", {
        text: locmap.getLocaleName(loc),
        href: cldrLoad.linkToLocale(loc),
      })
    );
    li.append(locLabel);
    if (e.count) {
      locLabel.append(
        $(`<i/>`, {
          text: nf.format(e.count),
          class: "count",
          title: "number of votes for this locale",
        })
      );
    } else {
      locLabel.append(
        $(`<i/>`, {
          text: nf.format(e.count || 0),
          class: "count missingLoc",
          title: "number of votes for this locale",
        })
      );
    }
    if (e.missing) {
      locLabel.append(
        $(`<i/>`, {
          class: "missingLoc",
          text: "(No Coverage)",
          title: `No regular vetters for ${missingLocalesForOrg}`,
        })
      );
    }
    const myUsers = getUsersFor(e, uidToUser);
    if (myUsers && myUsers.length > 0) {
      const theUserBox = $("<span/>", { class: "participatingUsers" });
      li.append(theUserBox);
      myUsers.forEach(function (u) {
        verb(u, theUserBox);
      });
    }
  }
}

function verb(u, theUserBox) {
  const user = u.user;
  if (!user) {
    console.log("Empty user in verb");
    return;
  }
  const isVetter = u.isVetter;
  const count = u.count;

  const theU = $('<span class="participatingUser"></span>');
  theU.append($(cldrAccount.createUser(user)));
  if (user.allLocales) {
    theU.addClass("allLocales");
    theU.append(
      $("<span/>", {
        text: "*",
        title: "user can vote for all locales",
      })
    );
  }
  if (isVetter) {
    theU.addClass("vetter");
  }
  if (!count) {
    theU.addClass("noparticip");
  }
  theU.append(
    $("<span/>", {
      class: count ? "count" : "count noparticip",
      text: nf.format(count || 0),
      title: "number of this user’s votes",
    })
  );
  theUserBox.append(theU);
}

/**
 * Calculate the top level data,
 * returning localeToData, totalCount, uidToUser
 */
function calculateData(json) {
  // first, collect coverage
  const { participation, users, languagesMissing } = json;

  const localeToData = {};
  let totalCount = 0;
  function getLocale(loc) {
    const e = (localeToData[loc] = localeToData[loc] || {
      vetters: [],
      count: 0,
      participation: {},
    });
    return e;
  }
  const uidToUser = {};
  // collect users w/ coverage
  users.forEach((u) => {
    const { locales, id } = u;
    uidToUser[id] = u;
    (locales || []).forEach((loc) => getLocale(loc).vetters.push(id));
  });
  // collect missing
  (languagesMissing || []).forEach((loc) => (getLocale(loc).missing = true));
  participation.forEach(({ count, locale, user, cov_count }) => {
    const e = getLocale(locale);
    e.count += count;
    totalCount += count;
    e.participation[user] = count;
    e.cov_count = cov_count; // cov_count is currently per-locale data.
  });

  return { localeToData, totalCount, uidToUser };
}

/**
 * @param {Number[]} e.vetters - vetter ID int array
 * @param {Object} e.participation  - map of int (id) to count
 * @param {Object} uidToUser - map from ID to user
 */
function getUsersFor(e, uidToUser) {
  // collect all users
  const myUids = new Set(e.vetters.map((v) => Number(v)));
  const vetterSet = new Set(e.vetters.map((v) => Number(v)));
  for (const [id, p] of Object.entries(e.participation)) {
    // participation comes from the votes table
    // uidToUser comes from the users table
    // Sometimes uidToUser[id] is undefined (maybe user was deleted)
    // --- skip id in that case
    if (id in uidToUser) {
      myUids.add(Number(id));
    } else {
      // this does happen for me when logged in as admin on localhost
      console.log("getUsersFor bad id: " + id);
    }
  }
  let myUsers = Array.from(myUids.values());
  if (myUsers.length) {
    myUsers = myUsers.map(function (id) {
      return myMap(id, uidToUser, vetterSet, e);
    });
    myUsers = myUsers.sort(mySort);
  }
  return myUsers;
}

function myMap(id, uidToUser, vetterSet, e) {
  if (!uidToUser[id]) {
    // this no longer happens for me, since adding filter [if (id in uidToUser)] in getUsersFor
    console.log("myMap bad id: " + id);
  }
  return {
    user: uidToUser[id],
    isVetter: vetterSet.has(id),
    count: e.participation[id],
  };
}

function mySort(a, b) {
  if (!a.user || !a.user.name) {
    // this no longer happens for me, since adding filter [if (id in uidToUser)] in getUsersFor
    console.log("mySort bad user a: " + a);
    return 0;
  }
  if (!b.user || !b.user.name) {
    console.log("mySort bad user b: " + b);
    return 0;
  }
  return a.user.name.localeCompare(b.user.name);
}

export { load };
