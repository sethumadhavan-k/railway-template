FROM ubuntu/squid:latest

COPY squid.conf.template /etc/squid/squid.conf.template
COPY squid-common.conf.template /etc/squid/dify_common.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
