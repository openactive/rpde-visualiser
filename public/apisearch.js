let endpoint;
let taxonomyType;
let vocabulary;
let taxonomyTerm;
let proximity;
let coverage;
let childTaxonomyTerm;
let childChildTaxonomyTerm;
let day;
let startTime;
let endTime;
let keywords;
let minAge;
let maxAge;
let viz1;
let taxonomys;
let config;

// This demo is based on https://neofusion.github.io/hierarchy-select/

// Using source files:
// - https://neofusion.github.io/hierarchy-select/v2/dist/hierarchy-select.min.js
// - https://neofusion.github.io/hierarchy-select/v2/dist/hierarchy-select.min.css
// - https://www.openactive.io/skos.js/dist/skos.min.js

// ** Example of how to render a hierarchy from the activity list **

function renderTree(concepts, level, output) {
  // Recursively .getNarrower() on concepts
  concepts.forEach(function(concept) {
    var label = concept.prefLabel;
    var hidden = "";
    // Include altLabels (e.g. Group Cycling) to make them visible to the user
    if (concept.altLabel && concept.altLabel.length > 0) {
      label = label + ' / ' + concept.altLabel.join(' / ')
    }
    // Include hiddenLabels (e.g. 5aside) as hidden so they will still match search terms
    if (concept.hiddenLabel && concept.hiddenLabel.length > 0) {
      hidden = concept.hiddenLabel.join(' / ')
    }
    
    // Use jQuery to escape all values when outputting HTML
    output.push($( "<a/>", {
      "class": "dropdown-item",
      "data-value": concept.id,
      "data-hidden": hidden,
      "data-level": level,
      "href": "#",
      text: label
    }));
    
    var narrower = concept.getNarrower();
    if (narrower) {
      renderTree(narrower, level + 1, output);
    }
  });
  return output;
}


// ** Example of displaying this hierarchy **

$(function() {
  // Load the activity list
  // (note this file should be copied to your server on a nightly cron and served from there)
  $.getJSON('https://openactive.io/activity-list/activity-list.jsonld', function(data) {
    // Use SKOS.js to read the file (https://www.openactive.io/skos.js/)
    var scheme = new skos.ConceptScheme(data);
    
    // Render the activity list in a format the HierarchySelect will understand
    $('.activity-list-dropdown .hs-menu-inner').append(renderTree(scheme.getTopConcepts(), 1, []));
    
    // Initialise the HierarchySelect using the activity list
    $('.activity-list-dropdown').hierarchySelect({
      width: 'auto',
      
      // Set initial dropdown state based on the hidden field's initial value
      initialValueSet: true,
      
      // Update other elements when a selection is made 
      // (Note the value of the #activity-list-id input is set automatically by HierarchySelect upon selection)
      onChange: function(id) {
        var concept = scheme.getConceptByID(id);
        var prefLabel = concept ? concept.prefLabel : "";
        var definition = concept && concept.definition ? concept.definition : "";

        // Set prefLabel for submitting to server
        $('#activity-list-prefLabel').val(prefLabel);
      }
    });
    
    // Note: use the below to set dropdown value elsewhere if necessary
    //$('.activity-list-dropdown').setValue("https://openactive.io/activity-list#72d19892-5f55-4e9c-87b0-a5433baa49c8");
  });
});

function updateEndpoint() {
    $("#results").empty();
    $("#graphTab").addClass("disabled").removeClass("active");
    $("#validatePanel").addClass("disabled").removeClass("active");
    $("#validateTab").addClass("disabled").removeClass("active");
    $("#graphPanel").removeClass("active");
    $("#resultTab").addClass("active");
    $("#resultPanel").addClass("active");

    endpoint = $("#endpoint").val();
    updateParameters("endpoint", endpoint);
    clearForm(endpoint);
    $("#Vocabulary").val("");
    $("#TaxonomyTerm").val("");
    $("#Coverage").val("");
}

function updateEndpointUpdate() {

    if (endpoint !== "") {
        // $("#TaxonomyType").prop('disabled', false);
        // $("#Vocabulary").prop('disabled', false);
        $("#execute").prop('disabled', false);
    }
    if (endpoint === "") {
        $("#TaxonomyType").prop('disabled', true);
        $("#Vocabulary").prop('disabled', true);
        $("#TaxonomyTerm").prop('disabled', true);
        $("#execute").prop('disabled', false);
    }

    // updateParameters("execute", true);
}


function updateCoverage() {
    coverage = $("#Coverage").val();
    updateParameters("coverage", coverage);
}

function updateProximity() {
    proximity = $("#Proximity").val();
    updateParameters("proximity", proximity);
}

function updateDay() {
    day = $("#Day").val();
    updateParameters("day", day);
}

function updateStartTime() {
    startTime = $("#StartTime").val();
    updateParameters("startTime", startTime);
}

function updateEndTime() {
    endTime = $("#EndTime").val();
    updateParameters("endTime", endTime);
}

function updateMinAge() {
    minAge = $("#minAge").val();
    updateParameters("minAge", minAge);
}

function updateMaxAge() {
    maxAge = $("#maxAge").val();
    updateParameters("maxAge", maxAge);
}

function updateKeywords() {
    keywords = $("#Keywords").val();
    updateParameters("keywords", keywords);
}

// noinspection SpellCheckingInspection
function updateParameters(parm, parmVal) {
    window.history.replaceState('', '', updateURLParameter(window.location.href, parm, parmVal));
}

function clearForm(endpoint) {

    if (endpoint) {
        window.location.search = "?endpoint=" + endpoint;
    } else {
        window.location.search = "";
    }
}

loadedData = {};
currentStoreId = 0;
itemCount = 0;
matchingItemCount = 0;
harvestStart = luxon.DateTime.now();
pagesLoaded = 0;

function clearStore() {
  loadedData = {};
  currentStoreId++;
  itemCount = 0;
  matchingItemCount = 0;
  harvestStart = luxon.DateTime.now();
  pagesLoaded = 0;
}

function storeJson(id, json) {
  loadedData[id] = json;
}

function getJSON(id) {
  getVisualise(id, "json");
}

function getRawJSON(id) {
  let url;
  url = config.schemaType === "OpenReferral" ? $("#endpoint").val() + "/" + "services" + "/complete/" + id : $("#endpoint").val() + "/" + "services" + "/" + id;
  let win = window.open(url, "_blank");
  win.focus();
}

function getVisualise(id, VisType) {
  VisType = VisType || "image";
  $("#resultTab").removeClass("active");
  $("#validateTab").removeClass("active");
  $("#graphTab").addClass("active");
  $("#resultPanel").removeClass("active");
  $("#validatePanel").removeClass("active");
  $("#graphPanel").addClass("active");
  $("#tabs")[0].scrollIntoView();
  $("#graphTab").removeClass("disabled");
  $("#validateTab").addClass("disabled");
  $("#validateTab").hide();
  $("#richnessTab").hide();

  $("#graph").html(`<pre>${JSON.stringify(loadedData[id], null, 2)}</pre>`);
}


function executeForm(pageNumber) {
    if (pageNumber === undefined) {
        pageNumber = null;
    }
    let error = false;
    if ($("#endpoint").val() === "") {
        error = true;
        alert("Missing Endpoint");
    }
    if ($("#TaxonomyType").val() === "") {
        alert("Missing Taxonomy Type");
        error = true;
    }
    if ($("#Proximity").val() !== "") {
        if (isNaN($("#Proximity").val())) {
            alert("Proximity must be a number");
            error = true;
        }
    }

    if (error) {
        return;
    }

    updateParameters("execute", true);

    if (pageNumber !== null) {
        updateParameters("page", pageNumber);
    }

    $("#results").empty();
    $("#tabs").show();
    $("#results").empty();
    $("#graphTab").addClass("disabled").removeClass("active");
    $("#graphPanel").removeClass("active");
    $("#validateTab").removeClass("active").hide();
    $("#validatePanel").removeClass("active");
    $("#richnessTab").removeClass("active").hide();
    $("#richnessPanel").removeClass("active");
    $("#resultTab").addClass("active");
    $("#resultPanel").addClass("active");

    var filters = {
      activity: $('#activity-list-id').val(),
      coverage: $("#Coverage").val(),
      proximity: $("#Proximity").val(),
      day: $("#Day").val(),
      startTime: $("#StartTime").val(),
      endTime: $("#EndTime").val(),
      minAge: $("#minAge").val(),
      maxAge: $("#maxAge").val(),
      vocabulary: $("#Vocabulary").val(),
      keywords: $("#Keywords").val()
    }

    updateScroll();
    $("#results").append("<div><img src='images/ajax-loader.gif' alt='Loading'></div>");

    clearStore();

    $("#progress").text(`Loading first page...`);
    clearApiPanel();

    var url = $("#endpoint").val();
    loadRPDEPage(url, currentStoreId, filters);

}

function resolveProperty(value, prop) {
  return value.data && (value.data[prop] || (value.data.superEvent && value.data.superEvent[prop]));
}

function loadRPDEPage(url, storeId, filters) {

  // Another store has been loaded, so do nothing
  if (storeId !== currentStoreId) {
    return;
  }

  pagesLoaded++;

  if (pagesLoaded < 50) {
    addApiPanel(url, true);
  } else if (pagesLoaded === 50) {
    addApiPanel('Page URLs past this point are hidden for efficiency', false);
  }

  let results = $("#results");
  $.ajax({
      async: true,
      type: 'GET',
      url: '/fetch?url=' + encodeURIComponent(url),
      timeout: 30000
  })
      .done(function (data) {
          if (itemCount === 0) {
            results.empty();
            results.append("<div id='resultsDiv' class='container-fluid'></div>");
          }
          results = $("#resultsDiv");

          $.each(data.content ? data.content : data.items, function (_, value) {
              itemCount++;
              if (value.state === 'updated') {
                // Filter
                var itemMatchesActivity = !filters.activity ? true : (resolveProperty(value, 'activity') || []).filter(x => (x.id || x['@id'] || 'NONE') === filters.activity).length > 0;
                var itemMatchesDay = !filters.day ? true : value.data && value.data.eventSchedule && value.data.eventSchedule.filter(x => x.byDay && x.byDay.includes(filters.day) || x.byDay.includes(filters.day.replace('https', 'http'))).length > 0;
                if (itemMatchesActivity && itemMatchesDay) {
                  matchingItemCount++;
                  
                  storeJson(value.id, value.data);

                  if (matchingItemCount < 100) {
                    results.append(
                        "<div id='col" + matchingItemCount + "' class='row rowhover'>" +
                        "    <div id='text" + matchingItemCount + "' class='col-md-1 col-sm-2 text-truncate'> " + value.id + "</div>" +
                        "    <div class='col'>" + resolveProperty(value, 'name')  + "</div>" +
                        "    <div class='col'>" +
                        "        <div class='visualise'>" +
                        "            <div class='row'>" +
                        "                <div class='col' style=\"text-align: right\">" +
                        //"                    <button id='" + matchingItemCount + "' class='btn btn-secondary btn-sm mb-1 visualiseButton'>Visualise</button>" +
                        "                    <button id='json" + matchingItemCount + "' class='btn btn-secondary btn-sm mb-1 '> JSON</button>" +
                        //"                    <button id='validate" + matchingItemCount + "' class='btn btn-secondary btn-sm mb-1'>Validate</button>" +
                        //"                    <button id='richness" + matchingItemCount + "' class='btn btn-secondary btn-sm mb-1'>Richness</button>" +
                        "                </div>" +
                        "            </div>" +
                        "        </div>" +
                        "    </div>" +
                        "</div>"
                    );

                    $("#json" + matchingItemCount).on("click", function () {
                        getJSON(value.id);
                    });
                    $("#validate" + matchingItemCount).on("click", function () {
                        getValidate(value.id);
                    });
                    $("#richness" + matchingItemCount).on("click", function () {
                        getRichness(value.id);
                    });

                    if (value.id.length > 8) {
                        $("#col" + matchingItemCount).hover(function () {
                            $("#text" + matchingItemCount).removeClass("text-truncate");
                            $("#text" + matchingItemCount).prop("style", "font-size: 70%");
                        }, function () {
                            $("#text" + matchingItemCount).addClass("text-truncate");
                            $("#text" + matchingItemCount).prop("style", "font-size: 100%");
                        });
                    }
                  } else if (matchingItemCount === 100) {
                    results.append(
                      "<div class='row rowhover'>" +
                      "    <div>Only the first 100 items are shown, the rest are hidden (TODO: Add paging)</div>" +
                      "</div>"
                  );
                  }
                  
                }
              }
          });

          let pageNo = data.number ? data.number : data.page;
          let firstPage = "";
          if (data.first === true) {
              firstPage = "disabled='disabled'";
          }

          let lastPage = "";
          if (data.last === true) {
              lastPage = "disabled='disabled'";
          }

          
          const elapsed = luxon.DateTime.now().diff(harvestStart, ['seconds']).toObject().seconds;
          if (url !== data.next) {
            $("#progress").text(`Items loaded ${itemCount}; results ${matchingItemCount} in ${elapsed} seconds; Loading...`);
            loadRPDEPage(data.next, storeId, filters);
          } else {
            $("#progress").text(`Items loaded ${itemCount}; results ${matchingItemCount}; Loading complete in ${elapsed} seconds`);
            if (data.items.length === 0 && matchingItemCount === 0) {
              results.append("<div><p>No results found</p></div>");
            }
          }
      })
      .fail(function () {
        const elapsed = luxon.DateTime.now().diff(harvestStart, ['seconds']).toObject().seconds;
        $("#progress").text(`Items loaded ${itemCount}; results ${matchingItemCount} in ${elapsed} seconds; An error occurred, please retry.`);
        $("#results").empty().append("An error has occurred");
        $("#results").append('<div><button class="show-error btn btn-secondary">Retry</button></div>');
        $(".show-error").on("click", function () {
            executeForm();
        });
      });
}

function populateEndpointsFromJson() {
    $.getJSON("/datasets", function (data) {
        $("#endpoint").empty();
        $.each(data.endpoints, function (index, item) {
            $("#endpoint").append("<option value='" + item.url + "'>" + item.name + "</option>");
        });
    }).done(function () {
        setupPageEndpoints();
    });
}

function getRawJSON(id) {
    let url;
    url = config.schemaType === "OpenReferral" ? $("#endpoint").val() + "/" + "services" + "/complete/" + id : $("#endpoint").val() + "/" + "services" + "/" + id;
    let win = window.open(url, "_blank");
    win.focus();
}

function getValidate(id) {
    $("#resultTab").removeClass("active");
    $("#resultPanel").removeClass("active");

    $("#graphTab").removeClass("active");
    $("#graphPanel").removeClass("active");

    $("#validateTab").addClass("active");
    $("#validatePanel").addClass("active");
    $("#tabs")[0].scrollIntoView();
    $("#validateTab").removeClass("disabled");

    $("#richnessTab").hide();

    $("#validateTab").show();

    let url = $("#endpoint").val() + "/services/" + id;

    addApiPanel("Get JSON for validate", false);
    addApiPanel(url);
    addApiPanel('<button class="btn btn-secondary" onclick=\'win = window.open("' + url + '", "_blank"); win.focus()\'>Show results</button>', false);
    updateScroll();
    $.ajax({
        async: true,
        type: 'GET',
        url: url,
        dataType: "json"
    })
        .done(function (data) {
            postValidate(data);
        });
}

function postValidate(data) {
    let url = "https://api.porism.com/ServiceDirectoryService/services/validate";
    addApiPanel("Post JSON for validate", false);
    addApiPanel(url);
    updateScroll();
    $("#validatePanel").empty();
    $("#validatePanel").append('<img alt="loading" src="images/ajax-loader.gif">');

    $.post({url: url, contentType: "application/json"}, JSON.stringify(data), function (resBody) {
        $("#validatePanel").empty();
        $("#validatePanel").append('<h5>' + data.name + '</h5><h6>' + data.id + '</h6>');
        $("#validatePanel").append("<h5>Issues</h5>");
        for (let i = 0; i < resBody.length; i++) {
            $("#validatePanel").append("<p>" + resBody[i].message + "</p>");
        }
    }, "json");
}

function getRichness(id) {
    $("#resultTab").removeClass("active");
    $("#resultPanel").removeClass("active");

    $("#graphTab").removeClass("active");
    $("#graphPanel").removeClass("active");

    $("#validateTab").removeClass("active");
    $("#validatePanel").removeClass("active");

    $("#richnessTab").addClass("active");
    $("#richnessPanel").addClass("active");

    $("#tabs")[0].scrollIntoView();
    $("#richnessTab").removeClass("disabled");

    $("#validateTab").hide();

    $("#richnessTab").show();
    let url;
    if (config.schemaType === "OpenReferral") {
        url = $("#endpoint").val() + "/services/complete/" + id;
    } else {
        url = $("#endpoint").val() + "/services/" + id;
    }
    addApiPanel("Get JSON for richness", false);
    addApiPanel(url);
    addApiPanel('<button class="btn btn-secondary" onclick=\'win = window.open("' + url + '", "_blank"); win.focus()\'>Show results</button>', false);
    updateScroll();
    $.ajax({
        async: true,
        type: 'GET',
        url: url,
        dataType: "json"
    })
        .done(function (data) {
            postRichness(data);
        });

}

function postRichness(data) {
    let url = "https://api.porism.com/ServiceDirectoryService/services/richness";
    // console.log(data);
    // console.log(typeof data);
    // console.log(JSON.stringify(data));
    addApiPanel("Post JSON for richness", false);
    addApiPanel(url);
    updateScroll();

    $("#richness").empty();
    $("#richness").append('<img alt="loading" src="images/ajax-loader.gif">');

    $.post(
        {
            url: url,
            contentType: "application/json"
        },
        JSON.stringify(data), "json")
        .done(function (resBody) {
            $("#richness").empty();
            if (resBody.populated === undefined && resBody.not_populated === undefined) {
                $("#richness").append("<h3>Error</h3><p>" + resBody[0].message + "</p>");
                return;
            }
            $("#richness").append('<h5>' + (data.name || (data.superEvent && data.superEvent.name)) + '</h5><h6>' + data.id + '</h6>');
            let Richness = "";
            let populated = "";
            for (let i = 0; i < resBody.populated.length; i++) {
                populated = populated + "<div class='row rowhover'><div class='col-sm-8'>" + resBody.populated[i].name + "</div><div class='col-sm-4'>" + resBody.populated[i].percentage + "%</div></div>";
            }
            Richness = Richness + "<div class='card-group mt-2'>";
            Richness = Richness + (
                '<div class="card">' +
                '<div class="card-header bg-light"><h4>Populated</h4></div>' +
                '<div class="card-body">' + populated + '</div>' +
                '</div>');

            let not_populated = "";
            for (let i = 0; i < resBody.not_populated.length; i++) {
                not_populated = not_populated + "<div class='row rowhover'><div class='col-sm-8'>" + resBody.not_populated[i].name + "</div><div class='col-sm-4'>" + resBody.not_populated[i].percentage + "%</div></div>";
            }
            Richness +=
                '<div class="card">' +
                '<div class="card-header bg-light"><h4>Not populated</h4></div>' +
                '<div class="card-body">' + not_populated + '</div>' +
                '</div></div>';

            $("#richness").append(Richness);

            $("#richness").append("<h3>Overall</h3>" +
                "<p>Score: " + resBody.richness_percentage + "%</p>");
        })
        .fail(function (error) {
            $("#richness").empty().append("<div>An error has occurred</div>");
            $("#richness").append('<div>' + error.responseJSON.message + '</div>');
        });

}

function clearApiPanel() {
  $("#api").empty();
}

function addApiPanel(text, code) {
    if (code === undefined) {
        code = true;
    }
    let panel = $("#api");
    let colour = "";
    if (code) {
        colour = "lightgray";
    }
    panel.add("<div style='background-color: " + colour + "'><p class='text-wrap' style='word-wrap: break-word'>" + text + "</p></div>")
        .appendTo(panel);
}

const getUrlParameter = function getUrlParameter(sParam) {
    let sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;
    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

function updateURLParameter(url, param, paramVal) {
    let TheAnchor;
    let newAdditionalURL = "";
    let tempArray = url.split("?");
    let baseURL = tempArray[0];
    let additionalURL = tempArray[1];
    let temp = "";
    if (additionalURL) {
        let tmpAnchor = additionalURL.split("#");
        let TheParams = tmpAnchor[0];
        TheAnchor = tmpAnchor[1];
        if (TheAnchor)
            additionalURL = TheParams;
        tempArray = additionalURL.split("&");
        for (let i = 0; i < tempArray.length; i++) {
            if (tempArray[i].split('=')[0] !== param) {
                newAdditionalURL += temp + tempArray[i];
                temp = "&";
            }
        }
    } else {
        let tmpAnchor = baseURL.split("#");
        let TheParams = tmpAnchor[0];
        TheAnchor = tmpAnchor[1];
        if (TheParams)
            baseURL = TheParams;
    }
    if (TheAnchor)
        paramVal += "#" + TheAnchor;
    const rows_txt = temp + "" + param + "=" + paramVal;
    return baseURL + "?" + newAdditionalURL + rows_txt;
}

function updateScroll() {
    const element = document.getElementById("api");
    element.scrollTop = element.scrollHeight;
}

function setupPage() {
    populateEndpointsFromJson();
}

function setupPageEndpoints() {

    $("#endpoint").on("change", function () {
        updateEndpoint();
    });

    $("#clear").on("click", function () {
        clearForm($("#endpoint").val());
    });
    $("#execute").on("click", function () {
        executeForm();
    });
    $("#TaxonomyType").on("change", function () {
        updateTaxonomyType();
    });
    $("#Keywords").on("change", function () {
        updateKeywords();
    });
    $("#Vocabulary").on("change", function () {
        updateVocabulary();
    });
    $("#TaxonomyTerm").on("change", function () {
        updateTaxonomyTerm();
    });
    $("#ChildTaxonomyTerm").on("change", function () {
        updateChildTaxonomyTerm();
    });
    $("#ChildChildTaxonomyTerm").on("change", function () {
        updateChildChildTaxonomyTerm();
    });
    $("#Coverage").on("change", function () {
        updateCoverage();
    });
    $("#Proximity").on("change", function () {
        updateProximity();
    });
    $("#Day").on("change", function () {
        updateDay();
    });
    $("#StartTime").on("change", function () {
        updateStartTime();
    });
    $("#EndTime").on("change", function () {
        updateEndTime();
    });
    $("#minAge").on("change", function () {
        updateMinAge();
    });
    $("#maxAge").on("change", function () {
        updateMaxAge();
    });


    $("#tabs").hide();

    if (getUrlParameter("endpoint") !== undefined) {
        $("#endpoint").val(getUrlParameter("endpoint"));
        $.getJSON("/datasets", function (data) {
            $.each(data.endpoints, function (index, item) {
                if (item.url === $("#endpoint option:selected").val()) {
                    config = item;
                }
            });
        }).done(function () {
            updateEndpointUpdate()
            if (getUrlParameter("execute") === "true") {
              executeForm();
            }
        });
    } else {
        updateParameters("endpoint", $("#endpoint").val());
        setupPage();
    }
}



$(function () {
    setupPage()
});
