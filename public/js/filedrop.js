// Author: Carlos Xavier Hernández <cxh@stanford.edu>
// Contributors:
// Copyright (c) 2014, Stanford University
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//   Redistributions of source code must retain the above copyright notice,
//   this list of conditions and the following disclaimer.
//
//   Redistributions in binary form must reproduce the above copyright
//   notice, this list of conditions and the following disclaimer in the
//   documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
// IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
// PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
// TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
// LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

var upload_results;

// Handle file upload from file selector
function handleFileSelect(evt) {
  evt.stopPropagation();
  evt.preventDefault();

  var files = evt.dataTransfer.files; // FileList object.

  // files is a FileList of File objects. List some properties.
  for (var i = 0, f; f = files[i]; i++) {
    var reader = new FileReader();
    reader.readAsText(f);
    $(reader).on('load', processFile);
    pushToHTML(f);
  }
}

// Handle file upload from drag+drop
function handleInput() {
  var fileInput = $('#upload');
  if (!window.FileReader) {
    alert('Your browser is not supported');
  }
  var input = fileInput.get(0);

  // Create a reader object
  var reader = new FileReader();
  if (input.files.length) {
    var f = input.files[0];
    reader.readAsText(f);
    $(reader).on('load', processFile);
    pushToHTML(f);
  } else {
    alert('Please upload a file before continuing');
  }
  $('#upload').val('');
}

// List the file name and type
function pushToHTML(f) {
  var output = [];
  output.push('<label><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ')',
    '</label>');
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

// Handle file dragging
function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// Sends MSM file to Tornado Server to make network
function processFile(e) {
  var file = e.target.result;
  if (file && file.length) {
    upload_results = file.split("\n");
    post2tornado();
  }
}

// Creates POST to Tornado Server
function post2tornado() {

  //Define Error Handling
  var wrong_type_msg = 'Aw shucks! MutInf-View requires a Matrix Market file as input.',
    we_did_bad = 'Aw shucks! MutInf-View did something wrong. We apologize.',
    response,
    request;

  // Try REQUEST
  try {

    request = {
      matrix: upload_results.join("\n")
    };

    // Retrieve RESPONSE
    response = $.ajax({
      type: "POST",
      url: "/process",
      async: true,
      data: request,
      success: function(res) {

        input = JSON.parse(res);
        $scope = angular.element('chord-diagram').scope()
        $scope.master = input;
        chart($scope);

      },
      error: function() {
        bootbox.alert(wrong_type_msg);
      },
    });

  } catch (err) {
    bootbox.alert(we_did_bad);
  }
}

// Add drag+drop listeners
var dropZone = document.getElementById('dropzone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);
