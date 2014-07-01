function ChartEvents(options) {
    ChartTimeline.call(this, options);
    var self = this;

    var dragHandler = function() {
        if (self.state.initialX === null) {
            self.svg.root.attr('dragging', 'true');
            self.state.initialX = d3.event.sourceEvent.screenX;
        }
        var offset = self.state.initialX - d3.event.sourceEvent.screenX;
        var domain = self.scale.x.domain();
        var domainDays = 4*7;
        if (!self.isWeeks()) {
            // this is more complex (months differ in length, leap year trololo)
            domainDays = moment(domain[1]).diff(moment(domain[0]), 'days');
        }
        var offsetTime = domainDays*24*60*60*1000/self.style.width*offset;
        // time/pix density 
        var start = moment(domain[0]).milliseconds(offsetTime);
        var end = moment(domain[1]).milliseconds(offsetTime);

        if (d3.event.type === 'dragend') {
            self.state.initialX = null;
            self.setScrolled(true);
            self.svg.root.attr('dragging', null);
            self.svg.scrollbox.attr('transform', 'translate(0, 0)');
            self.scale.x.domain([start.toDate(), end.toDate()]);
            self.update({type: 'render'});
        } else {
            self.svg.scrollbox.attr('transform', 'translate(' + -offset + ', 0)');
        }
    };

    var scrollHandler = function() {
        var scrolledUp = d3.event.wheelDelta > 0;
        var x = self.scale.x;
        var domain = x.domain();
        var midDate = moment(x.invert((x(domain[0]) + x(domain[1])) / 2));

        var shift = (scrolledUp ? 1: -1) * (self.isWeeks() ? 4 : 10);
        var newStart = moment(domain[0]).add('days', shift);
        var newEnd = moment(newStart);
        if (self.isWeeks()) {
            newEnd.add('weeks', 4);
        } else {
            newEnd.add('days', self.monthInDays);
        }

        d3.event.preventDefault();
        x.domain([newStart.toDate(), newEnd.toDate()]);
        self.setScrolled(true);
        self.update({type: 'scroll-' + (scrolledUp ? 'right' : 'left')});
        return false;
    };    

    self.dragBehavior = d3.behavior.drag()
        .on('drag', dragHandler)
        .on('dragend', dragHandler);

    // code points for IE9 only
    var codepoints = { zoomPlus: '\ue238', zoomMinus: '\ue237', reset: '\ue435' };
    var htmls = {
        zoomMinus: '&#xe238; <title>Månedsvisning</title>',
        zoomPlus: '&#xe237; <title>Ugevisning</title>',
        reset: '&#xe435; <title>Gå til til dags dato</title>'
    };

    self.iconZoomClick = function() {
        var domain = self.scale.x.domain();
        var start = moment(domain[0]);
        var end = moment(domain[1]);
        var isWeeks = self.isWeeks(); // going to months

        var currentMid = isWeeks ? start.add('days', 14) : start.add('months', 2);
        var newStart = isWeeks ? moment(currentMid).add('months', -2) : moment(currentMid).add('weeks', -2);
        var newEnd = isWeeks ? moment(newStart).add('days', self.monthInDays) : moment(newStart).add('weeks', 4);
        var cp = isWeeks ? codepoints.zoomPlus : codepoints.zoomMinus;
        var markup = self.isWeeks() ? htmls.zoomPlus : htmls.zoomMinus;

        d3.select(this).text(cp).html(markup);
        self.scale.x.domain([newStart.toDate(), newEnd.toDate()]);
        self.setWeeks(!isWeeks);
        self.update({type: 'zoom-' + (isWeeks ? 'out' : 'in')});
    };

    self.iconResetClick = function() {
        self.scale.x.domain(self.isWeeks() ? self.domainDefaults.weeks : self.domainDefaults.months);
        self.setScrolled(false);
        self.update({});
    };

    self.constructEventsElm = function() {
        self.svg.root.on('mousewheel', scrollHandler);

        // rect that handles dragging
        self.svg.root.append('rect')
            .attr('class', 'dragbox')
            .attr('width', self.style.width)
            .attr('height', self.style.timelineHeight + 30)
            .attr('y', self.style.height - self.style.timelineHeight - 15)
            .attr('fill', 'transparent')
            .call(self.dragBehavior);    

        // toggles months/weeks
        self.svg.icons.append('text')
            .attr('x', -42)
            .attr('y', self.style.iconOffset)
            .attr('class', 'icon')
            .text(codepoints.zoomMinus)
            .html(htmls.zoomMinus)
            .attr('title', 'foobar')
            .on('click', self.iconZoomClick);

        // resets to default view
        // show after movement
        self.svg.icons.append('text')
            .attr('x', -40)
            .attr('y', self.style.iconOffset + 40)
            .attr('class', 'icon reset-view')
            .style('display', 'none')
            .text(codepoints.reset)
            .html(htmls.reset)
            .on('click', self.iconResetClick);
    };

    // start building elements
    self.constructTimelineSvg();
    self.constructEventsElm();
    // run once to draw initial dynamic data (timeline)
    self.update({type: 'render'});

}
ChartEvents.prototype = Object.create(ChartTimeline.prototype);

var chart = new ChartEvents({elmId: 'calendar', data: generateData()});