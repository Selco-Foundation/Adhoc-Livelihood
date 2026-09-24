FROM docker.elastic.co/kibana/kibana:8.11.3

# Copy the plugin zip into the container
COPY ./all_tickets_current_status/build/fullExport-8.11.3.zip /tmp/all_tickets_current_status-8.11.3.zip
COPY ./vendor_open_ticket_summary/build/fullExport-8.11.3.zip /tmp/vendor_open_ticket_summary-8.11.3.zip

# Install the plugin using the Kibana CLI
RUN kibana-plugin install file:///tmp/all_tickets_current_status-8.11.3.zip
RUN kibana-plugin install file:///tmp/vendor_open_ticket_summary-8.11.3.zip
